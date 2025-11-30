import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const filename = searchParams.get("filename");

        if (!filename) {
            return NextResponse.json({ error: "Filename is required" }, { status: 400 });
        }

        // Security: Prevent directory traversal
        if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
            return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
        }

        // Construct path to public/templates
        const filePath = join(process.cwd(), "public", "templates", filename);

        if (!existsSync(filePath)) {
            console.error(`Template not found at: ${filePath}`);
            return NextResponse.json({ error: "Template file not found" }, { status: 404 });
        }

        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Download error:", error);
        return NextResponse.json({ error: "Failed to download template" }, { status: 500 });
    }
}
