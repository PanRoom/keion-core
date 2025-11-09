"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

type MemberOption = {
  member_id: number;
  name: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Verifies whether the provided memberIds already form an existing band lineup.
const hasBandWithSameMembers = async (memberIds: number[]) => {
  const normalizedIds = [...memberIds].map((id) => Number(id)).sort((a, b) => a - b);
  const expectedSignature = normalizedIds.join(",");

  const { data: candidateMembership, error: candidateError } = await supabase
    .from("band_members")
    .select("band_id, member_id")
    .in("member_id", normalizedIds);

  if (candidateError) {
    throw candidateError;
  }

  const candidateBandIds = new Set<number>();
  const candidateMemberSets = new Map<number, Set<number>>();

  for (const row of candidateMembership ?? []) {
    const bandId = Number(row.band_id);
    const memberId = Number(row.member_id);

    const set = candidateMemberSets.get(bandId) ?? new Set<number>();
    set.add(memberId);
    candidateMemberSets.set(bandId, set);

    if (set.size === normalizedIds.length && normalizedIds.every((id) => set.has(id))) {
      candidateBandIds.add(bandId);
    }
  }

  if (candidateBandIds.size === 0) {
    return false;
  }

  const { data: fullMembership, error: fullMembershipError } = await supabase
    .from("band_members")
    .select("band_id, member_id")
    .in("band_id", Array.from(candidateBandIds));

  if (fullMembershipError) {
    throw fullMembershipError;
  }

  const fullMembershipByBand = new Map<number, number[]>();
  for (const row of fullMembership ?? []) {
    const bandId = Number(row.band_id);
    const memberId = Number(row.member_id);
    const list = fullMembershipByBand.get(bandId) ?? [];
    list.push(memberId);
    fullMembershipByBand.set(bandId, list);
  }

  for (const members of fullMembershipByBand.values()) {
    const signature = members.sort((a, b) => a - b).join(",");
    if (signature === expectedSignature) {
      return true;
    }
  }

  return false;
};

export default function CreateBandPage() {
  const [bandName, setBandName] = useState("");
  const [memberOptions, setMemberOptions] = useState<MemberOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<(number | null)[]>([
    null,
  ]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<
    { type: "success" | "error"; text: string } | null
  >(null);

  useEffect(() => {
    let isMounted = true;

    async function loadMembers() {
      setIsLoadingMembers(true);
      const { data, error } = await supabase
        .from("members")
        .select("member_id, name")
        .order("name", { ascending: true });

      if (!isMounted) return;

      if (error) {
        console.error("メンバー取得エラー:", error);
        setMessage({
          type: "error",
          text: "メンバー一覧の読み込みに失敗しました",
        });
        setMemberOptions([]);
      } else {
        setMemberOptions(data ?? []);
      }

      setIsLoadingMembers(false);
    }

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectableMembers = useMemo(() => {
    return [...memberOptions].sort((a, b) => a.name.localeCompare(b.name));
  }, [memberOptions]);

  const handleAddMemberRow = () => {
    setSelectedMembers((prev) => [...prev, null]);
  };

  const handleRemoveMemberRow = (index: number) => {
    setSelectedMembers((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleChangeMember = (index: number, value: string) => {
    const memberId = value ? Number(value) : null;
    setSelectedMembers((prev) => {
      const next = [...prev];
      next[index] = Number.isNaN(memberId) ? null : memberId;
      return next;
    });
  };

  const formatErrorMessage = (error: unknown) => {
    if (error && typeof error === "object") {
      const maybeError = error as {
        message?: string;
        error_description?: string;
        details?: string;
        hint?: string;
      };

      if (maybeError.message) {
        return maybeError.details
          ? `${maybeError.message} (${maybeError.details})`
          : maybeError.message;
      }

      if (maybeError.error_description) {
        return maybeError.error_description;
      }

      if (maybeError.details) {
        return maybeError.details;
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    try {
      return JSON.stringify(error);
    } catch (jsonError) {
      console.error("エラーメッセージの整形に失敗しました:", jsonError);
      return "バンドの作成に失敗しました";
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    const trimmedName = bandName.trim();
    const chosenMemberIds = selectedMembers.filter(
      (memberId): memberId is number => typeof memberId === "number"
    );

    if (!trimmedName) {
      setMessage({ type: "error", text: "バンド名を入力してください" });
      return;
    }

    if (chosenMemberIds.length === 0) {
      setMessage({
        type: "error",
        text: "少なくとも1人のメンバーを選択してください",
      });
      return;
    }

    const uniqueMemberIds = Array.from(new Set(chosenMemberIds));
    if (uniqueMemberIds.length !== chosenMemberIds.length) {
      setMessage({
        type: "error",
        text: "同じメンバーを重複して選択しないでください",
      });
      return;
    }

    setIsSubmitting(true);
    let createdBandId: number | null = null;

    try {
      const {
        count: sameNameCount,
        error: bandCheckError,
      } = await supabase
        .from("bands")
        .select("band_id", { count: "exact", head: true })
        .eq("band_name", trimmedName);

      if (bandCheckError) {
        throw bandCheckError;
      }

      if ((sameNameCount ?? 0) > 0) {
        setMessage({
          type: "error",
          text: "そのバンドは存在しています",
        });
        return;
      }
      const hasExactDuplicate = await hasBandWithSameMembers(uniqueMemberIds);
      if (hasExactDuplicate) {
        setMessage({
          type: "error",
          text: "同じメンバーのバンドが存在しています",
        });
        return;
      }

      const { data: bandInsertData, error: bandInsertError } = await supabase
        .from("bands")
        .insert({ band_name: trimmedName })
        .select("band_id")
        .single();

      if (bandInsertError || !bandInsertData) {
        throw bandInsertError ?? new Error("バンドIDの取得に失敗しました");
      }

      const bandMemberRows = uniqueMemberIds.map((memberId) => ({
        band_id: bandInsertData.band_id,
        member_id: memberId,
      }));

      createdBandId = bandInsertData.band_id;

      const { error: bandMembersInsertError } = await supabase
        .from("band_members")
        .insert(bandMemberRows);

      if (bandMembersInsertError) {
        throw bandMembersInsertError;
      }

      const {
        data: createdBand,
        error: verifyError,
      } = await supabase
        .from("bands")
        .select("band_id")
        .eq("band_id", bandInsertData.band_id)
        .maybeSingle();

      if (verifyError || !createdBand) {
        throw verifyError ?? new Error("バンドの作成を確認できませんでした");
      }

      setMessage({ type: "success", text: "バンドを作成しました" });
      setBandName("");
      setSelectedMembers([null]);
    } catch (error) {
      const formatted = formatErrorMessage(error);
      console.error("バンド作成エラー:", error);
      setMessage({ type: "error", text: formatted || "バンドの作成に失敗しました" });

      if (createdBandId !== null) {
        const { error: cleanupError } = await supabase
          .from("bands")
          .delete()
          .eq("band_id", createdBandId);

        if (cleanupError) {
          console.error("バンドクリーンアップエラー:", cleanupError);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold tracking-tight">バンド作成</h1>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-lg border bg-card p-6"
        >
          <div className="space-y-2">
            <label htmlFor="band-name" className="text-sm font-medium">
              バンド名
            </label>
            <input
              id="band-name"
              type="text"
              value={bandName}
              onChange={(event) => setBandName(event.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="バンド名を入力"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">バンドメンバー</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMemberRow}
                disabled={isSubmitting || isLoadingMembers}
              >
                メンバーを追加
              </Button>
            </div>

            {isLoadingMembers && (
              <p className="text-xs text-muted-foreground">読み込み中...</p>
            )}

            {selectedMembers.map((memberId, index) => (
              <div key={index} className="flex items-center gap-3">
                <select
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={memberId ?? ""}
                  onChange={(event) =>
                    handleChangeMember(index, event.target.value)
                  }
                  disabled={isSubmitting || isLoadingMembers}
                >
                  <option value="">メンバーを選択</option>
                  {selectableMembers.map((memberOption) => (
                    <option
                      key={memberOption.member_id}
                      value={memberOption.member_id}
                    >
                      {memberOption.name}
                    </option>
                  ))}
                </select>

                {selectedMembers.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleRemoveMemberRow(index)}
                    disabled={isSubmitting}
                  >
                    削除
                  </Button>
                )}
              </div>
            ))}
          </div>

          {message && (
            <div
              className={`rounded-md border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-900"
                  : "border-red-200 bg-red-50 text-red-900"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "作成中..." : "バンドを作成"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}