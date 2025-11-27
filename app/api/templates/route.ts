import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const isDefault = searchParams.get("default") === "true";

        if (isDefault) {
            const template = await prisma.template.findFirst({
                where: { isDefault: true },
            });

            if (!template) {
                return NextResponse.json({ error: "No default template found" }, { status: 404 });
            }
            return NextResponse.json(template);
        }

        const templates = await prisma.template.findMany({
            orderBy: { createdAt: "desc" },
        });
        return NextResponse.json(templates);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch templates" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.formData();
        const file: File | null = data.get("file") as unknown as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (!file.name.endsWith(".docx")) {
            return NextResponse.json({ error: "Only .docx files are allowed" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = join(process.cwd(), "public", "templates");
        await mkdir(uploadDir, { recursive: true });

        // Generate unique filename
        const uniqueFilename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
        const path = join(uploadDir, uniqueFilename);

        await writeFile(path, buffer);

        // Check if this is the first template (make it default if so)
        const count = await prisma.template.count();
        const isDefault = count === 0;

        const template = await prisma.template.create({
            data: {
                name: file.name,
                filename: uniqueFilename,
                originalName: file.name,
                size: file.size,
                isDefault: isDefault,
            },
        });

        return NextResponse.json(template);
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
