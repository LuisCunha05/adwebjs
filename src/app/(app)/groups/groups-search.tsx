"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";

export function GroupsSearch() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialQ = searchParams.get("q") || "";
    const [q, setQ] = useState(initialQ);
    const [isPending, startTransition] = useTransition();

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        startTransition(() => {
            const params = new URLSearchParams(searchParams);
            if (q.trim()) {
                params.set("q", q.trim());
            } else {
                params.delete("q");
            }
            router.replace(`?${params.toString()}`);
        });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Pesquisar</CardTitle>
                <CardDescription>
                    Informe o nome ou parte do nome do grupo.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
                    <div className="flex-1 min-w-[200px] space-y-2">
                        <label htmlFor="q" className="text-sm font-medium leading-none">
                            Termo
                        </label>
                        <Input
                            id="q"
                            placeholder="Ex.: TI ou ADWEB"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            className="max-w-md"
                        />
                    </div>
                    <Button type="submit" disabled={isPending}>
                        <Search className="size-4 mr-2" />
                        {isPending ? "Buscando…" : "Buscar"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
