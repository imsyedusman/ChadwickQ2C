import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { unlink } from "fs/promises";
import { join } from "path";

const prisma = new PrismaClient();

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (id === 'system-default') {
            return NextResponse.json({ error: "Cannot delete system default template" }, { status: 403 });
        }

        const template = await prisma.template.findUnique({
            where: { id },
        });

        if (!template) {
            return NextResponse.json({ error: "Template not found" }, { status: 404 });
        }

        // Delete file
        const path = join(process.cwd(), "public", "templates", template.filename);
        try {
            await unlink(path);
        } catch (e) {
            console.warn("File not found on disk, deleting DB record anyway");
        }

        await prisma.template.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        if (body.isDefault) {
            // Unset all defaults first
            await prisma.template.updateMany({
                where: { id: { not: id } },
                data: { isDefault: false },
            });

            // If it's system default, we just needed to unset others (logic in GET handles the rest)
            if (id === 'system-default') {
                return NextResponse.json({ success: true, isDefault: true });
            }

            // Set this one as default
            const updated = await prisma.template.update({
                where: { id },
                data: { isDefault: true },
            });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: "Invalid update" }, { status: 400 });
    } catch (error) {
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}
