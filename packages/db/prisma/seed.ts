import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.mstEvent.createMany({
    data: [
      { eventCode: "1Q", eventName: "1Q", eventOrder: 1, delFlg: false },
      { eventCode: "2Q", eventName: "2Q", eventOrder: 2, delFlg: false },
      { eventCode: "3Q", eventName: "3Q", eventOrder: 3, delFlg: false },
      { eventCode: "4Q", eventName: "4Q", eventOrder: 4, delFlg: false },
      { eventCode: "利計標準", eventName: "利計標準", eventOrder: 5, delFlg: false },
      { eventCode: "利計中間", eventName: "利計中間", eventOrder: 6, delFlg: false },
      { eventCode: "利計最終", eventName: "利計最終", eventOrder: 7, delFlg: false }
    ],
    skipDuplicates: true
  });

  await prisma.mstExpenseCategory.createMany({
    data: [
      {
        expenseCategoryCode: "TRAVEL",
        expenseCategoryName: "旅費交通費",
        delFlg: false
      },
      {
        expenseCategoryCode: "MEAL",
        expenseCategoryName: "会議費",
        delFlg: false
      },
      {
        expenseCategoryCode: "SUPPLY",
        expenseCategoryName: "消耗品費",
        delFlg: false
      },
      {
        expenseCategoryCode: "OUTSOURCE",
        expenseCategoryName: "外注費",
        delFlg: false
      },
      {
        expenseCategoryCode: "AD",
        expenseCategoryName: "広告宣伝費",
        delFlg: false
      }
    ],
    skipDuplicates: true
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("✅ Seed completed");
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    throw e;
  });
