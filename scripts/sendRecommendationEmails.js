import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../src/utils/emailService.js';
import axios from 'axios';

dotenv.config();

const prisma = new PrismaClient();

function buildTenantRecommendationHtml(tenantName, recommendations, appUrl, year) {
  let propertyHtml = '';
  for (const prop of recommendations) {
    propertyHtml += `
      <table width="100%" style="margin-bottom:20px;border:1px solid #eee;border-radius:6px;">
        <tr>
          <td width="120" style="padding:10px;">
            <img src="${prop.imageUrl || 'https://via.placeholder.com/100x80'}" alt="${prop.title}" style="width:100px;height:80px;object-fit:cover;border-radius:4px;">
          </td>
          <td style="padding:10px;">
            <strong>${prop.title}</strong> in <strong>${prop.city}</strong><br>
            <span>Rent: <strong>${prop.rentPerMonth} ETB</strong></span><br>
            <span>Landlord: ${prop.landlordName} (<a href="mailto:${prop.landlordEmail}" style="color:#5c6ac4;">${prop.landlordEmail}</a>)</span><br>
            <a href="${prop.detailsUrl || appUrl}" style="display:inline-block;margin-top:8px;padding:8px 16px;background:#5c6ac4;color:#fff;text-decoration:none;border-radius:4px;">View Details</a>
          </td>
        </tr>
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f4f4f7;color:#51545e;">
        <table width="100%" style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#5c6ac4;color:#fff;padding:20px;text-align:center;">
              <h1>Your Property Recommendations</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p>Hi ${tenantName},</p>
              <p>Here are some properties you might like:</p>
              ${propertyHtml}
              <p style="margin-top:30px;">Visit <a href="${appUrl}" style="color:#5c6ac4;">Rentify</a> to explore more properties!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;font-size:12px;color:#a8aaaf;text-align:center;">
              © ${year} Rentify. All rights reserved.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

function buildLandlordRecommendationHtml(landlordName, propertyTitle, tenants, appUrl, year) {
  let tenantHtml = '';
  for (const t of tenants) {
    tenantHtml += `
      <table width="100%" style="margin-bottom:20px;border:1px solid #eee;border-radius:6px;">
        <tr>
          <td style="padding:10px;">
            <strong>${t.name}</strong> (<a href="mailto:${t.email}" style="color:#5c6ac4;">${t.email}</a>)<br>
            <span>Profile: <a href="${t.profileUrl || '#'}" style="color:#5c6ac4;">View Profile</a></span>
          </td>
        </tr>
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f4f4f7;color:#51545e;">
        <table width="100%" style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#5c6ac4;color:#fff;padding:20px;text-align:center;">
              <h1>Potential Tenants for Your Property</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p>Hi ${landlordName},</p>
              <p>Here are some tenants who may be interested in your property <strong>${propertyTitle}</strong>:</p>
              ${tenantHtml}
              <p style="margin-top:30px;">Visit <a href="${appUrl}" style="color:#5c6ac4;">Rentify</a> to manage your listings!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;font-size:12px;color:#a8aaaf;text-align:center;">
              © ${year} Rentify. All rights reserved.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function sendTenantRecommendations() {
  const tenants = await prisma.user.findMany({ where: { role: 'TENANT', isVerified: true } });

  for (const tenant of tenants) {
    try {
      const { data } = await axios.get(`https://hrp-server-api.onrender.com/api/recommendation-proxy/tenant/${tenant.id}`);
      const recommendations = data.recommendations;

      if (recommendations && recommendations.length > 0) {
        const htmlContent = buildTenantRecommendationHtml(
          tenant.name,
          recommendations,
          process.env.FRONTEND_URL,
          new Date().getFullYear()
        );

        const payload = {
          sender: { name: process.env.EMAIL_SENDER_NAME, email: process.env.EMAIL_SENDER_ADDRESS },
          to: [{ email: tenant.email, name: tenant.name }],
          subject: 'Your Personalized Property Recommendations',
          htmlContent
        };

        await sendEmail('https://api.brevo.com/v3/smtp/email', payload);
        console.log(`✅ Sent recommendations to ${tenant.email}`);
      } else {
        console.log(`⚠️ No recommendations found for tenant ${tenant.email} (ID: ${tenant.id})`);
      }
    } catch (err) {
      console.error(`❌ Failed to fetch/send recommendations for tenant ${tenant.email} (ID: ${tenant.id}):`, err.message);
    }
  }
}

async function sendLandlordRecommendations() {
  const landlords = await prisma.user.findMany({ where: { role: 'LANDLORD', isVerified: true } });

  for (const landlord of landlords) {
    const properties = await prisma.property.findMany({ where: { landlordId: landlord.id } });

    for (const property of properties) {
      try {
        const { data } = await axios.get(`https://hrp-server-api.onrender.com/api/recommendation-proxy/landlord/${property.id}`);
        const tenants = data.recommendations;

        if (tenants && tenants.length > 0) {
          const htmlContent = buildLandlordRecommendationHtml(
            landlord.name,
            property.title,
            tenants,
            process.env.FRONTEND_URL,
            new Date().getFullYear()
          );

          const payload = {
            sender: { name: process.env.EMAIL_SENDER_NAME, email: process.env.EMAIL_SENDER_ADDRESS },
            to: [{ email: landlord.email, name: landlord.name }],
            subject: `Potential Tenants for Your Property: ${property.title}`,
            htmlContent
          };

          await sendEmail('https://api.brevo.com/v3/smtp/email', payload);
          console.log(`✅ Sent tenant recommendations for property "${property.title}" to ${landlord.email}`);
        } else {
          console.log(`⚠️ No tenant recommendations for property "${property.title}" (ID: ${property.id})`);
        }
      } catch (err) {
        console.error(`❌ Failed to fetch/send recommendations for property "${property.title}" (ID: ${property.id}):`, err.message);
      }
    }
  }
}

async function main() {
  await sendTenantRecommendations();
  await sendLandlordRecommendations();
  await prisma.$disconnect();
}

main();
