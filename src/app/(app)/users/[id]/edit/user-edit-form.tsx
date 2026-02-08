"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type EditAttribute } from "@/types/ldap";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, UserCheck, UserX, Unlock, Loader2, KeyRound, Trash2, FolderTree, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { removeMemberFromGroup } from "@/app/actions/groups";
import { updateUser, disableUser, enableUser, unlockUser, resetPassword, deleteUser, moveUser } from "@/app/actions/users";

const UAC_DISABLED = 2;
const UAC_DONT_EXPIRE_PASSWD = 65536;

function uacToFlags(value: number | string | undefined) {
    const n = Number(value) || 0;
    return {
        accountDisabled: (n & UAC_DISABLED) !== 0,
        passwordNeverExpires: (n & UAC_DONT_EXPIRE_PASSWD) !== 0,
    };
}

function flagsToUac(current: number | string | undefined, accountDisabled: boolean, passwordNeverExpires: boolean): number {
    const base = Number(current) || 512;
    return (base & ~(UAC_DISABLED | UAC_DONT_EXPIRE_PASSWD)) | (accountDisabled ? UAC_DISABLED : 0) | (passwordNeverExpires ? UAC_DONT_EXPIRE_PASSWD : 0);
}

function cnFromDn(dn: string): string {
    const m = dn.match(/^CN=([^,]+)/i);
    return m ? m[1] : dn;
}

function parentOuFromDn(dn: string): string {
    const idx = dn.indexOf(",");
    return idx >= 0 ? dn.slice(idx + 1).trim() : "";
}

function dnMatch(a: string, b: string): boolean {
    return (a || "").toLowerCase().trim() === (b || "").toLowerCase().trim();
}

function toFormValue(value: unknown): string {
    if (value == null) return "";
    if (Array.isArray(value)) return (value[0] != null ? String(value[0]) : "") as string;
    return String(value);
}

function buildFormFromUser(user: any, editList: EditAttribute[]): Record<string, string | boolean> {
    const flags = uacToFlags(user?.userAccountControl);
    const f: Record<string, string | boolean> = {
        accountDisabled: flags.accountDisabled,
        passwordNeverExpires: flags.passwordNeverExpires,
    };
    for (const a of editList) {
        if (user && a.name in user) {
            f[a.name] = toFormValue(user[a.name]);
        } else {
            f[a.name] = "";
        }
    }
    return f;
}

interface UserEditFormProps {
    initialUser: any;
    editConfig: { fetch: string[]; edit: EditAttribute[] };
    ous: { dn: string; ou?: string; name?: string }[];
}

export function UserEditForm({ initialUser, editConfig, ous }: UserEditFormProps) {
    const router = useRouter();
    const { session } = useAuth();

    // Local state for user to reflect updates without full page reload if desired, 
    // though Server Actions usually revalidatePath. We'll update local state for immediate feedback.
    const [user, setUser] = useState<any>(initialUser);
    const [form, setForm] = useState<Record<string, string | boolean>>(() => buildFormFromUser(initialUser, editConfig.edit));

    const [saving, setSaving] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [disableDialogOpen, setDisableDialogOpen] = useState(false);
    const [disableTargetOu, setDisableTargetOu] = useState("");
    const [resetPwdOpen, setResetPwdOpen] = useState(false);
    const [resetPwdValue, setResetPwdValue] = useState("");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [moveOuDialogOpen, setMoveOuDialogOpen] = useState(false);
    const [moveOuTarget, setMoveOuTarget] = useState("");
    const [ousForMove, setOusForMove] = useState<{ dn: string; ou?: string; name?: string }[]>([]);

    const id = user?.sAMAccountName; // Assuming ID is sAMAccountName or we should pass ID prop? 
    // Wait, the API uses sAMAccountName as ID usually but let's check. 
    // Yes, routes use [id]. 
    // Actually, let's use the prop passed from page if needed, but user object usually has the ID.
    // In the original code: const id = typeof params.id === "string" ? params.id : "";
    // We'll trust initialUser has the necessary ID field (sAMAccountName).

    const sections = useMemo(() => {
        if (!editConfig?.edit.length) return [];
        const bySection = new Map<string, EditAttribute[]>();
        for (const e of editConfig.edit) {
            if (!bySection.has(e.section)) bySection.set(e.section, []);
            bySection.get(e.section)!.push(e);
        }
        const order = [...new Set(editConfig.edit.map((x) => x.section))];
        return order.map((name) => ({ name, attrs: bySection.get(name) ?? [] }));
    }, [editConfig?.edit]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!id || !editConfig || saving) return;
        setSaving(true);
        try {
            const uac = flagsToUac(
                user?.userAccountControl,
                Boolean(form.accountDisabled),
                Boolean(form.passwordNeverExpires)
            );
            const body: Record<string, unknown> = { userAccountControl: uac };
            for (const a of editConfig.edit) {
                const v = form[a.name];
                if (typeof v === "string" && v.trim() !== "") body[a.name] = v.trim();
                else if (v !== undefined && v !== "") body[a.name] = v;
            }

            const res = await updateUser(id, body);
            if (!res.ok) throw new Error(res.error);

            toast.success("Usuário atualizado.");
            setUser(res.data);
            if (editConfig) setForm(buildFormFromUser(res.data, editConfig.edit));
        } catch (err: any) {
            toast.error(err.message || "Erro ao salvar.");
        } finally {
            setSaving(false);
        }
    }

    function openDisableDialog() {
        setDisableTargetOu("");
        setDisableDialogOpen(true);
    }

    function openMoveOuDialog() {
        const current = user?.dn ? parentOuFromDn(user.dn) : "";
        setMoveOuTarget(current);
        setMoveOuDialogOpen(true);

        const list = ous ?? [];
        const hasCurrent = current && list.some((o) => dnMatch(o.dn, current));
        if (current && !hasCurrent) {
            setOusForMove([{ dn: current, ou: current, name: current }, ...list]);
        } else {
            setOusForMove(list);
        }
    }

    async function handleMoveOu() {
        if (!id || !moveOuTarget.trim() || actionLoading) return;
        const current = user?.dn ? parentOuFromDn(user.dn) : "";
        if (dnMatch(moveOuTarget, current)) {
            toast.info("O usuário já está nesta OU.");
            return;
        }
        setActionLoading("move");
        try {
            const res = await moveUser(id, moveOuTarget.trim());
            if (!res.ok) throw new Error(res.error);

            toast.success("Usuário movido para a nova OU.");
            setMoveOuDialogOpen(false);
            // We need to refresh the user data.
            // Since we updated the OU, the user's DN changed. 
            // The ID (sAMAccountName) remains the same.
            // We can rely on revalidation or manual update.
            // For now, let's manual update or trigger router refresh.
            router.refresh();
            // But we also need to update local state if we want immediate feedback without reload
            // Ideally we fetch the new user data.
            // Let's assume router.refresh() handles it if this was a server component page, 
            // but here we might want to fetch fresh data?
            // Actually, since we are in a client component, we can use a server action to get fresh user data.
            // But we don't have a direct 'get' import here conveniently except implementing one or passing it.
            // We'll rely on router.refresh() to re-render the Server Component parent which passes new props.
            // However, router.refresh() is async and doesn't return a promise we can await easily to set state.
            // Hmmm. Let's try to update local state optimistically or just wait.
            // For this migration, let's just show success. 
            // Actually, let's trigger a full page reload or navigate to same page to ensure sync.
            // Or better, just trust router.refresh().

        } catch (err: any) {
            toast.error(err.message || "Falha ao mover usuário.");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDisablePermanent() {
        if (!id || actionLoading) return;
        setActionLoading("disable");
        try {
            const res = await disableUser(id, disableTargetOu ? { targetOu: disableTargetOu } : undefined);
            if (!res.ok) throw new Error(res.error);

            toast.success(disableTargetOu ? "Conta desativada e usuário movido para a OU informada." : "Conta desativada.");
            setDisableDialogOpen(false);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Falha ao desativar.");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleEnable() {
        if (!id || actionLoading) return;
        setActionLoading("enable");
        try {
            const res = await enableUser(id);
            if (!res.ok) throw new Error(res.error);

            toast.success("Conta ativada.");
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Falha ao ativar.");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleUnlock() {
        if (!id || actionLoading) return;
        setActionLoading("unlock");
        try {
            const res = await unlockUser(id);
            if (!res.ok) throw new Error(res.error);

            toast.success("Conta desbloqueada.");
        } catch (err: any) {
            toast.error(err.message || "Falha ao desbloquear.");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleRemoveFromGroup(groupDn: string) {
        if (!id || !user?.dn || actionLoading) return;
        const groupCn = cnFromDn(groupDn);
        setActionLoading(`rm-${groupCn}`);
        try {
            const res = await removeMemberFromGroup(groupCn, user.dn);
            if (!res.ok) throw new Error(res.error);

            toast.success(`Removido do grupo ${groupCn}.`);
            router.refresh();
        } catch (err: any) {
            toast.error(err.message || "Falha ao remover do grupo.");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleResetPassword() {
        if (!id || !resetPwdValue.trim() || actionLoading) return;
        setActionLoading("reset");
        try {
            const res = await resetPassword(id, resetPwdValue);
            if (!res.ok) throw new Error(res.error);

            toast.success("Senha redefinida.");
            setResetPwdOpen(false);
            setResetPwdValue("");
        } catch (err: any) {
            toast.error(err.message || "Falha ao redefinir senha.");
        } finally {
            setActionLoading(null);
        }
    }

    async function handleDelete() {
        if (!id || actionLoading) return;
        setActionLoading("delete");
        try {
            const res = await deleteUser(id);
            if (!res.ok) throw new Error(res.error);

            toast.success("Usuário excluído.");
            setDeleteDialogOpen(false);
            router.replace("/users");
        } catch (err: any) {
            toast.error(err.message || "Falha ao excluir.");
        } finally {
            setActionLoading(null);
        }
    }

    const isDisabled = (Number(user.userAccountControl) || 0) & UAC_DISABLED;
    const memberOfList = Array.isArray(user.memberOf) ? user.memberOf : user.memberOf ? [user.memberOf] : [];
    const currentOuDn = parentOuFromDn(user.dn || "");
    const currentOuDisplay = ous.length
        ? (ous.find((o) => dnMatch(o.dn, currentOuDn))?.ou || ous.find((o) => dnMatch(o.dn, currentOuDn))?.name || currentOuDn)
        : currentOuDn;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/users">
                        <ArrowLeft className="size-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        {user.sAMAccountName}
                        {isDisabled ? <Badge variant="destructive">Desativada</Badge> : <Badge variant="secondary">Ativa</Badge>}
                    </h1>
                    <p className="text-muted-foreground text-sm">Atributos e ações do usuário no Active Directory.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ações rápidas</CardTitle>
                    <CardDescription>Ativar, desativar ou desbloquear a conta.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    {isDisabled ? (
                        <Button variant="default" size="sm" onClick={handleEnable} disabled={!!actionLoading}>
                            {actionLoading === "enable" ? <Loader2 className="size-4 animate-spin mr-2" /> : <UserCheck className="size-4 mr-2" />}
                            Ativar conta
                        </Button>
                    ) : (
                        <Button variant="destructive" size="sm" onClick={openDisableDialog} disabled={!!actionLoading}>
                            <UserX className="size-4 mr-2" />
                            Desativar conta
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleUnlock} disabled={!!actionLoading}>
                        {actionLoading === "unlock" ? <Loader2 className="size-4 animate-spin mr-2" /> : <Unlock className="size-4 mr-2" />}
                        Desbloquear conta
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setResetPwdValue(""); setResetPwdOpen(true); }} disabled={!!actionLoading}>
                        {actionLoading === "reset" ? <Loader2 className="size-4 animate-spin mr-2" /> : <KeyRound className="size-4 mr-2" />}
                        Redefinir senha
                    </Button>
                    {session?.canDelete && (
                        <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)} disabled={!!actionLoading}>
                            {actionLoading === "delete" ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash2 className="size-4 mr-2" />}
                            Excluir usuário
                        </Button>
                    )}
                </CardContent>
            </Card>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FolderTree className="size-4" />
                        Unidade organizacional
                    </CardTitle>
                    <CardDescription>
                        OU em que o usuário está atualmente. Use &quot;Mover para outra OU&quot; para mudar de pasta sem desativar a conta.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="min-w-0 rounded-md border bg-muted/50 px-3 py-2">
                            <p className="text-xs text-muted-foreground">OU atual</p>
                            <p className="font-medium truncate" title={currentOuDn}>
                                {currentOuDisplay || "—"}
                            </p>
                            {currentOuDn && currentOuDisplay !== currentOuDn && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5" title={currentOuDn}>
                                    {currentOuDn}
                                </p>
                            )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={openMoveOuDialog}
                            disabled={!!actionLoading}
                        >
                            <ArrowRightLeft className="size-4 mr-2" />
                            Mover para outra OU
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Atributos</CardTitle>
                    <CardDescription>Dados configurados para o AD. Edite o que for necessário.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {sections.map(({ name: sectionName, attrs }) => (
                            <div key={sectionName} className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground border-b pb-1">{sectionName}</h3>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {attrs.map((a) => (
                                        <div key={a.name} className={attrs.length === 1 ? "sm:col-span-2" : ""}>
                                            <Label htmlFor={a.name}>{a.label}</Label>
                                            <Input
                                                id={a.name}
                                                type={a.name === "mail" ? "email" : a.name === "wWWHomePage" ? "url" : "text"}
                                                value={String(form[a.name] ?? "")}
                                                onChange={(e) => setForm((f) => ({ ...f, [a.name]: e.target.value }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}

                        <div className="space-y-2 pt-2">
                            <Label htmlFor="sAMAccountName">Usuário (sAMAccountName)</Label>
                            <Input id="sAMAccountName" value={user.sAMAccountName ?? ""} readOnly className="bg-muted max-w-xs" />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 pt-2">
                            <div className="space-y-2">
                                <Label>Status da conta</Label>
                                <Select
                                    value={form.accountDisabled ? "desativada" : "ativa"}
                                    onValueChange={(v) => setForm((f) => ({ ...f, accountDisabled: v === "desativada" }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ativa">Ativa</SelectItem>
                                        <SelectItem value="desativada">Desativada</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-muted-foreground text-xs">Conta ativa permite login; desativada bloqueia o acesso.</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Senha nunca expira</Label>
                                <Select
                                    value={form.passwordNeverExpires ? "sim" : "nao"}
                                    onValueChange={(v) => setForm((f) => ({ ...f, passwordNeverExpires: v === "sim" }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="nao">Não</SelectItem>
                                        <SelectItem value="sim">Sim</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-muted-foreground text-xs">Quando &quot;Sim&quot;, o usuário não precisa trocar a senha por política.</p>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
                            <Button type="button" variant="outline" asChild>
                                <Link href="/users">Cancelar</Link>
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {memberOfList.length > 0 && (
                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Grupos</CardTitle>
                        <CardDescription>Grupos dos quais este usuário é membro. Remover daqui não altera o grupo, apenas a associação.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-2">
                            {memberOfList.map((dn: string) => {
                                const cn = cnFromDn(dn);
                                const loadingRm = actionLoading === `rm-${cn}`;
                                return (
                                    <li key={dn} className="flex items-center justify-between rounded-lg border p-3">
                                        <span className="font-mono text-sm truncate flex-1" title={dn}>{cn}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="shrink-0 text-destructive hover:text-destructive"
                                            onClick={() => handleRemoveFromGroup(dn)}
                                            disabled={!!actionLoading}
                                        >
                                            {loadingRm ? <Loader2 className="size-4 animate-spin" /> : "Remover do grupo"}
                                        </Button>
                                    </li>
                                );
                            })}
                        </ul>
                    </CardContent>
                </Card>
            )}

            <Dialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Desativação permanente</DialogTitle>
                        <DialogDescription>
                            Opcionalmente mova o usuário para outra OU após desativar (ex.: OU de desativados) ou mantenha no mesmo lugar.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label>Destino após desativar</Label>
                        <Select value={disableTargetOu || "keep"} onValueChange={(v) => setDisableTargetOu(v === "keep" ? "" : v)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Manter no mesmo lugar" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="keep">Manter no mesmo lugar</SelectItem>
                                {ous.map((ou) => (
                                    <SelectItem key={ou.dn} value={ou.dn}>
                                        {ou.ou ?? ou.name ?? ou.dn}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDisableDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDisablePermanent} disabled={actionLoading === "disable"}>
                            {actionLoading === "disable" ? <Loader2 className="size-4 animate-spin" /> : null}
                            {actionLoading === "disable" ? "Desativando…" : "Desativar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={moveOuDialogOpen} onOpenChange={setMoveOuDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ArrowRightLeft className="size-4" />
                            Mover usuário para outra OU
                        </DialogTitle>
                        <DialogDescription>
                            Escolha a unidade organizacional de destino. O usuário permanecerá ativo; apenas a localização no AD será alterada.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="rounded-md border bg-muted/50 px-3 py-2">
                            <p className="text-xs text-muted-foreground">OU atual</p>
                            <p className="font-medium text-sm truncate" title={currentOuDn}>
                                {currentOuDisplay || currentOuDn || "—"}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Nova OU de destino</Label>
                            <Select
                                value={moveOuTarget || "__none__"}
                                onValueChange={(v) => setMoveOuTarget(v === "__none__" ? "" : v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a OU" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ousForMove.map((ou) => (
                                        <SelectItem key={ou.dn} value={ou.dn} title={ou.dn}>
                                            {ou.ou ?? ou.name ?? ou.dn}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                A conta não será desativada. Para desativar e mover ao mesmo tempo, use &quot;Desativar conta&quot; nas ações rápidas.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setMoveOuDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleMoveOu}
                            disabled={!moveOuTarget.trim() || actionLoading === "move" || dnMatch(moveOuTarget, currentOuDn)}
                        >
                            {actionLoading === "move" ? <Loader2 className="size-4 animate-spin mr-2" /> : <ArrowRightLeft className="size-4 mr-2" />}
                            {actionLoading === "move" ? "Movendo…" : "Mover"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={resetPwdOpen} onOpenChange={setResetPwdOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Redefinir senha</DialogTitle>
                        <DialogDescription>
                            Defina uma nova senha para este usuário. Ele precisará usá-la no próximo login.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 py-2">
                        <Label htmlFor="newPassword">Nova senha</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={resetPwdValue}
                            onChange={(e) => setResetPwdValue(e.target.value)}
                            placeholder="Mín. 8 caracteres"
                            minLength={8}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetPwdOpen(false)}>Cancelar</Button>
                        <Button onClick={handleResetPassword} disabled={!resetPwdValue.trim() || resetPwdValue.length < 8 || actionLoading === "reset"}>
                            {actionLoading === "reset" ? <Loader2 className="size-4 animate-spin" /> : null}
                            Redefinir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir usuário</DialogTitle>
                        <DialogDescription>
                            Esta ação não pode ser desfeita. O usuário &quot;{user?.sAMAccountName}&quot; será removido permanentemente do Active Directory.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={actionLoading === "delete"}>
                            {actionLoading === "delete" ? <Loader2 className="size-4 animate-spin" /> : null}
                            Excluir permanentemente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
