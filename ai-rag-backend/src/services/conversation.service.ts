import { prisma } from "./prisma.service.js";

export async function createConversation(
  userId: string,
  title?: string
) {
  return prisma.conversation.create({
    data: {
      userId,
      title,
    },
  });
}

export async function getUserConversations(userId: string) {
  return prisma.conversation.findMany({
    where: {
      userId,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
}

export async function getConversation(
  conversationId: string,
  userId: string
) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });
}

export async function addMessage(
  conversationId: string,
  role: string,
  content: string
) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId,
        role,
        content,
      },
    });

    await tx.conversation.update({
      where: {
        id: conversationId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return message;
  });
}