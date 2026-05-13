import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const products = [
    {
      name: 'Oli MPX 2 0.8L',
      brand: 'Astra Honda Motor',
      partNumber: '08232-2MA-K8LN9',
      category: 'Oli Mesin',
      stock: 24,
      minStock: 5,
      purchasePrice: 45000,
      priceNormal: 55000,
      priceGrosir: 52000,
      priceMitra: 50000,
      barcode: 'MPX2-800'
    },
    {
      name: 'Ban Luar IRC 80/90-14 NR73',
      brand: 'IRC',
      category: 'Ban',
      stock: 10,
      minStock: 2,
      purchasePrice: 165000,
      priceNormal: 195000,
      priceGrosir: 185000,
      priceMitra: 180000,
      barcode: 'IRC-809014'
    },
    {
      name: 'Kampas Rem Depan Vario/Beat',
      brand: 'AHM',
      partNumber: '06455-KVB-401',
      category: 'Pengereman',
      stock: 50,
      minStock: 10,
      purchasePrice: 35000,
      priceNormal: 50000,
      priceGrosir: 45000,
      priceMitra: 42000,
      barcode: 'KAMPAS-KVB'
    },
    {
      name: 'Aki GS Astra GTZ5S',
      brand: 'GS Astra',
      category: 'Kelistrikan',
      stock: 8,
      minStock: 2,
      purchasePrice: 185000,
      priceNormal: 225000,
      priceGrosir: 215000,
      priceMitra: 210000,
      barcode: 'GS-GTZ5S'
    },
    {
      name: 'Busi Denso U27EPR-N9',
      brand: 'Denso',
      category: 'Pengapian',
      stock: 100,
      minStock: 20,
      purchasePrice: 12000,
      priceNormal: 18000,
      priceGrosir: 16000,
      priceMitra: 15000,
      barcode: 'BUSI-DENSO'
    },
    {
      name: 'V-Belt Kit Vario 125',
      brand: 'AHM',
      partNumber: '23100-KZR-601',
      category: 'CVT',
      stock: 5,
      minStock: 2,
      purchasePrice: 135000,
      priceNormal: 165000,
      priceGrosir: 155000,
      priceMitra: 150000,
      barcode: 'VBELT-KZR'
    }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { barcode: p.barcode },
      update: p,
      create: p
    });
  }

  console.log('Inventory items seeded successfully!');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
