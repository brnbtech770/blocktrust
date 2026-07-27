const{PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
  const users=await p.$queryRawUnsafe("SELECT id, email, password IS NOT NULL as has_password, \"sessionVersion\", \"createdAt\" FROM \"User\" WHERE email ILIKE '%1rst%' ORDER BY \"createdAt\"");
  console.log('Users 1rst.invest:', JSON.stringify(users, null, 2));
  const total=await p.$queryRawUnsafe("SELECT COUNT(*)::int as n FROM \"User\" WHERE password IS NOT NULL");
  console.log('Total users avec MDP:', total[0].n);
  await p.$disconnect();
})()
