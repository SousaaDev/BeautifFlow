import { pool } from './src/database/connection';

(async () => {
  try {
    console.log('Consultando tenant felipessalao1-9547...\n');

    const result = await pool.query(`
      SELECT id, slug, name, business_hours, settings, created_at, trial_ends_at
      FROM beauty_shops
      WHERE slug = $1
    `, ['felipessalao1-9547']);

    if (result.rows.length === 0) {
      console.log('Tenant não encontrado');
      process.exit(0);
    }

    const tenant = result.rows[0];
    console.log('=== DADOS DO TENANT ===');
    console.log('ID:', tenant.id);
    console.log('Slug:', tenant.slug);
    console.log('Name:', tenant.name);
    console.log('Created At:', tenant.created_at);
    console.log('Trial Ends At:', tenant.trial_ends_at);
    
    console.log('\n=== BUSINESS HOURS (RAW) ===');
    console.log('Type:', typeof tenant.business_hours);
    console.log('Value:', tenant.business_hours);

    if (typeof tenant.business_hours === 'string') {
      console.log('\n=== BUSINESS HOURS (PARSED) ===');
      const parsed = JSON.parse(tenant.business_hours);
      console.log(JSON.stringify(parsed, null, 2));

      console.log('\n=== HORÁRIOS POR DIA ===');
      console.log('Segunda-feira (Monday):', parsed.monday || 'Não definido');
      console.log('Terça-feira (Tuesday):', parsed.tuesday || 'Não definido');
      console.log('Quarta-feira (Wednesday):', parsed.wednesday || 'Não definido');
      console.log('Quinta-feira (Thursday):', parsed.thursday || 'Não definido');
      console.log('Sexta-feira (Friday):', parsed.friday || 'Não definido');
      console.log('Sábado (Saturday):', parsed.saturday || 'Não definido');
      console.log('Domingo (Sunday):', parsed.sunday || 'Não definido');
    } else if (typeof tenant.business_hours === 'object') {
      console.log('BUSINESS HOURS (Object):', JSON.stringify(tenant.business_hours, null, 2));
    }

    console.log('\n=== SETTINGS ===');
    console.log(JSON.stringify(tenant.settings, null, 2));

    process.exit(0);
  } catch (error) {
    console.error('Erro:', error);
    process.exit(1);
  }
})();
