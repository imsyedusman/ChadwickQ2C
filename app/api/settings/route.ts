import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        
        let settings = await (prisma as any).settings.findUnique({
            where: { id: 'global' },
        });

        if (!settings) {
            settings = await (prisma as any).settings.create({
                data: {
                    id: 'global',
                    labourRate: 100,
                    consumablesPct: 0.03,
                    overheadPct: 0.20,
                    engineeringPct: 0.20,
                    targetMarginPct: 0.18,
                    gstPct: 0.10,
                    roundingIncrement: 100,
                    minMarginAlertPct: 0.05,
                    copperPricePerKg: 15.0,
                },
            });
        }

        return NextResponse.json({
            ...settings,
            pipedriveToken: undefined, // Never expose token
            pipedriveTokenSet: !!(settings as any)?.pipedriveToken
        });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || (session.user as any).role === 'VIEWER') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();

        const settings = await (prisma as any).settings.upsert({
            where: { id: 'global' },
            update: {
                labourRate: body.labourRate,
                consumablesPct: body.consumablesPct,
                overheadPct: body.overheadPct,
                engineeringPct: body.engineeringPct,
                targetMarginPct: body.targetMarginPct,
                gstPct: body.gstPct,
                roundingIncrement: body.roundingIncrement,
                minMarginAlertPct: body.minMarginAlertPct,
                companyName: body.companyName,
                companyAddress: body.companyAddress,
                copperPricePerKg: body.copperPricePerKg,
                pipedriveToken: body.pipedriveToken,
            },
            create: {
                id: 'global',
                labourRate: body.labourRate || 100,
                consumablesPct: body.consumablesPct || 0.03,
                overheadPct: body.overheadPct || 0.20,
                engineeringPct: body.engineeringPct || 0.20,
                targetMarginPct: body.targetMarginPct || 0.18,
                gstPct: body.gstPct || 0.10,
                roundingIncrement: body.roundingIncrement || 100,
                minMarginAlertPct: body.minMarginAlertPct || 0.05,
                companyName: body.companyName,
                companyAddress: body.companyAddress,
                copperPricePerKg: body.copperPricePerKg || 15.0,
                pipedriveToken: body.pipedriveToken,
            },
        });

        return NextResponse.json(settings);
    } catch (error) {
        console.error('Settings update error:', error);
        return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }
}
