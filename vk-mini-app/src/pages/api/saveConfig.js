import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handle(req, res) {
  if (req.method === "POST") {
    await prisma.config.update({
      data: {
        ...req.body,
      },
      where: {
        id: req.body.id
      }
    });
    res.json("ok");
  }
}
