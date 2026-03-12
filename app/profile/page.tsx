import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { User, Mail, Shield, ShieldCheck, Calendar, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProfilePage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const { user } = session;
    const userWithRole = user as any;

    return (
        <div className="min-h-screen bg-[#f8fafc] py-12">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Your Profile</h1>
                    <p className="text-slate-500 mt-1">Manage your account information and preferences.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Main Info Card */}
                    <Card className="md:col-span-2 border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
                        <CardHeader className="bg-white border-b border-slate-100 p-8">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/20">
                                    {(user.name || user.email || '?')[0].toUpperCase()}
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-bold text-slate-900">{user.name}</CardTitle>
                                    <p className="text-slate-500 font-medium">{user.email}</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Mail size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Email Address</span>
                                    </div>
                                    <p className="text-slate-900 font-semibold">{user.email}</p>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Shield size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Access Role</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                                            {userWithRole.role}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Activity size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Account Status</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                                        <Calendar size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Member Since</span>
                                    </div>
                                    <p className="text-slate-900 font-semibold italic">N/A</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Sidebar Security Info */}
                    <div className="space-y-6">
                        <Card className="border-none shadow-lg shadow-slate-200/50 rounded-3xl p-6 bg-slate-900 text-white">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                                <ShieldCheck className="w-6 h-6 text-blue-400" />
                            </div>
                            <h3 className="text-lg font-bold mb-2">Security Verification</h3>
                            <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                Your account is protected by industry-standard encryption and role-based access control.
                            </p>
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Last Login</p>
                                <p className="text-xs font-medium text-slate-300">Just now</p>
                            </div>
                        </Card>

                        <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                            <h4 className="text-sm font-bold text-amber-900 mb-2">Notice</h4>
                            <p className="text-xs text-amber-800/80 leading-relaxed">
                                To change your email or password, please contact the system administrator.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
