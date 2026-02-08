"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function DownloadButton({ users }: { users: any[] }) {
    function download() {
        const UAC_DISABLED = 2;
        const UAC_DONT_EXPIRE_PASSWD = 65536;

        function uacToLabel(value: string | number | undefined): string {
            if (value == null) return "—";
            const n = Number(value);
            const disabled = (n & UAC_DISABLED) !== 0;
            const pwdNeverExpires = (n & UAC_DONT_EXPIRE_PASSWD) !== 0;
            const status = disabled ? "Desativada" : "Ativa";
            if (pwdNeverExpires) return `${status}, senha não expira`;
            return status;
        }

        function csvEscape(s: string): string {
            if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
        }

        const headers = ["usuário", "nome_completo", "email", "status"];
        const lines = [
            headers.join(","),
            ...users.map((u: any) =>
                [
                    csvEscape(String(u.sAMAccountName ?? "")),
                    csvEscape(String(u.name ?? u.cn ?? "")),
                    csvEscape(String(u.mail ?? u.userPrincipalName ?? "")),
                    csvEscape(uacToLabel(u.userAccountControl)),
                ].join(",")
            ),
        ];
        const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    return (
        <Button variant="outline" size="sm" onClick={download}>
            <Download className="size-4 mr-2" />
            Exportar CSV
        </Button>
    );
}
