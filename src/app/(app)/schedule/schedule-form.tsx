"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVacation } from "@/actions/schedule";
import { listUsers } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarClock, Loader2, UserSearch } from "lucide-react";
import { toast } from "sonner";
import { ActiveDirectoryUser } from "@/schemas/attributesAd";
import { PaginatedResult } from '@/types/ldap';

export function ScheduleForm() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);

    const [userSearch, setUserSearch] = useState("");
    const [userResults, setUserResults] = useState<ActiveDirectoryUser[]>([]);
    const [selectedUser, setSelectedUser] = useState<{ id: string; label: string } | null>(null);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [searching, setSearching] = useState(false);

    async function handleSearchUser() {
        const q = userSearch.trim();
        if (!q) {
            setUserResults([]);
            return;
        }
        setSearching(true);
        try {
            // Search by sAMAccountName as per original logic
            const res = await listUsers(q, "sAMAccountName");
            if (res.data) {
                if ('data' in res.data && Array.isArray(res.data.data)) {
                    setUserResults(res.data.data);
                } else if (Array.isArray(res.data)) {
                    setUserResults(res.data);
                } else {
                    setUserResults([]);
                }
            } else {
                setUserResults([]);
            }
        } catch {
            setUserResults([]);
        } finally {
            setSearching(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedUser || !startDate || !endDate || submitting) return;

        // Basic client validation
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            toast.error("Data de volta deve ser após a data de ida.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await createVacation(selectedUser.id, startDate, endDate);
            if (!res.ok) throw new Error(res.error);

            toast.success("Férias agendadas: conta será desativada na ida e reativada na volta.");

            // Reset form
            setSelectedUser(null);
            setStartDate("");
            setEndDate("");
            setUserSearch("");
            setUserResults([]);

            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Erro ao agendar.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="size-4" />
                    Agendar férias
                </CardTitle>
                <CardDescription>
                    Selecione o usuário e as datas. Na data de ida a conta será desativada; na data de volta, reativada.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label>Usuário</Label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="Buscar por nome de usuário..."
                                value={selectedUser ? selectedUser.label : userSearch}
                                onChange={(e) => {
                                    setUserSearch(e.target.value);
                                    if (selectedUser) setSelectedUser(null);
                                }}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearchUser())}
                            />
                            <Button type="button" variant="secondary" onClick={handleSearchUser} disabled={searching}>
                                {searching ? <Loader2 className="size-4 animate-spin" /> : <UserSearch className="size-4" />}
                            </Button>
                        </div>
                        {userResults.length > 0 && !selectedUser && (
                            <ul className="rounded-lg border divide-y max-h-40 overflow-auto">
                                {userResults.map((u) => (
                                    <li key={u.sAMAccountName}>
                                        <button
                                            type="button"
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                                            onClick={() => {
                                                setSelectedUser({
                                                    id: u.sAMAccountName || "",
                                                    label: [u.sAMAccountName, u.cn, u.displayName].filter(Boolean).join(" – "),
                                                });
                                                setUserResults([]);
                                                setUserSearch("");
                                            }}
                                        >
                                            {u.sAMAccountName}
                                            {u.cn || u.displayName ? ` — ${u.cn || u.displayName}` : ""}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="startDate">Data de ida (desativa)</Label>
                            <Input
                                id="startDate"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endDate">Data de volta (reativa)</Label>
                            <Input
                                id="endDate"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <Button type="submit" disabled={!selectedUser || !startDate || !endDate || submitting}>
                        {submitting ? <Loader2 className="size-4 animate-spin" /> : "Agendar férias"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
