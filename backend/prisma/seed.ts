import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash('admin123', 10);
  const asesoraPass = await bcrypt.hash('asesora123', 10);

  await prisma.user.createMany({
    data: [
      { name: 'Admin Principal', email: 'admin@crm.local', password: adminPass, role: 'admin', isActive: true },
      { name: 'María García', email: 'maria@crm.local', password: asesoraPass, role: 'asesora', isActive: true },
      { name: 'Laura López', email: 'laura@crm.local', password: asesoraPass, role: 'asesora', isActive: true },
      { name: 'Ana Martínez', email: 'ana@crm.local', password: asesoraPass, role: 'asesora', isActive: true },
      { name: 'Sara Rodríguez', email: 'sara@crm.local', password: asesoraPass, role: 'asesora', isActive: true },
    ],
    skipDuplicates: true,
  });

  await prisma.leadSource.createMany({
    data: [
      { name: 'Zapier', description: 'Leads automáticos desde Zapier' },
      { name: 'n8n', description: 'Leads automáticos desde n8n' },
      { name: 'Web', description: 'Formulario de contacto web' },
      { name: 'Teléfono', description: 'Llamada directa al call center' },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Seed completado: 1 admin, 4 asesoras, 4 fuentes de leads.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
