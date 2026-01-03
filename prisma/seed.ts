
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const email = 'demo@krisskross.com'
    const user = await prisma.user.upsert({
        where: { email: email },
        update: {},
        create: {
            email: email,
            name: 'Demo User',
            image: 'https://github.com/shadcn.png',
        },
    })
    console.log({ user })
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
