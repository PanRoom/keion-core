import { NextResponse } from "next/server";

import { createClient } from "@supabase/supabase-js";


// バンド希望スコアの二次元配列を扱うユーティリティ群。
type NumberMatrix = number[][];
type NicePreferEntry = string | 0;
type NicePreferMatrix = NicePreferEntry[][][];

const DAYS = 6; // スケジュールは 6 日分で固定
const HOURS = 12; // 1 日あたり 12 コマで固定
const LOCATIONS = ["310", "107"] as const;
const LOCATION_COUNT = LOCATIONS.length as number;


// Supabase クライアントの初期化
const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL:", NEXT_PUBLIC_SUPABASE_URL);
  console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY:", NEXT_PUBLIC_SUPABASE_ANON_KEY ? "exists" : "missing");
  throw new Error("Missing Supabase connection settings");
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 0 で初期化されたスコア行列を生成する。
function zeroMatrix(): NumberMatrix {
  return Array.from({ length: DAYS }, () => Array(HOURS).fill(0));
}


function addMatrixInto(target: NumberMatrix, source: NumberMatrix): void {
  for (let dayIndex = 0; dayIndex < DAYS; dayIndex += 1) {
    for (let hourIndex = 0; hourIndex < HOURS; hourIndex += 1) {
      target[dayIndex][hourIndex] += source[dayIndex][hourIndex];
    }
  }
}

// 任意型の入力を安全に NumberMatrix 化する。
function normalizeMatrix(raw: unknown): NumberMatrix {
  if (!Array.isArray(raw)) return zeroMatrix();
  return Array.from({ length: DAYS }, (_, i) => {
    const row = Array.isArray(raw[i]) ? raw[i] : [];
    return Array.from({ length: HOURS }, (_, j) => {
      const v = row[j];
      return typeof v === "number" ? v : 0;
    });
  });
}

// 行列全体に 1 つでも正のスコアがあるか確認する。
function hasAnyPositive(m: NumberMatrix): boolean {
  return m.some((row) => row.some((v) => v > 0));
}
type RawBandPreferEntry = [string, unknown];


type BandRow = { band_id: number; band_name: string };
type BandMemberRow = { band_id: number; member_id: number };
type MemberRow = { member_id: number; practice_available: boolean | null };
type MemberPreferRow = {
  member_id: number;
  priority: string | NumberMatrix | null;
  updated_at: string | null;
};

function parsePriorityMatrix(
  priority: string | NumberMatrix | null
): NumberMatrix | null {
  if (priority === null) return null;

  let raw: unknown = priority;
  if (typeof priority === "string") {
    try {
      raw = JSON.parse(priority);
    } catch (error) {
      console.warn("[members_prefer priority parse error]", error);
      return null;
    }
  }

  const matrix = normalizeMatrix(raw);
  return hasAnyPositive(matrix) ? matrix : null;
}


// 入力されたスコア配列を安全に正規化する。
// API から受け取る `[バンド名, 希望スコア行列]` の配列を検証＋正規化する。
function normalizeBandPreferEntries(
  raw: unknown
): [string, NumberMatrix][] {
  if (!Array.isArray(raw)) return [];

  const sanitized: [string, NumberMatrix][] = [];

  for (const entry of raw) {
    if (!Array.isArray(entry)) continue;
    const [bandName, preferMatrix] = entry as RawBandPreferEntry;
    // バンド名が欠けているエントリは丸ごと捨てる。
    if (typeof bandName !== "string") continue;

    const matrix = normalizeMatrix(preferMatrix);
    if (!hasAnyPositive(matrix)) continue;

    sanitized.push([bandName, matrix]);
  }

  return sanitized;
}


async function fetchBandPreferSource(
  weekId: number | null
): Promise<RawBandPreferEntry[]> {
  if (weekId === null || Number.isNaN(weekId)) {
    console.log("[fetchBandPreferSource] Invalid weekId:", weekId);
    return [];
  }

  console.log("[fetchBandPreferSource] Fetching data for week_id:", weekId);

  // 1. bandsテーブルからバンド情報を取得
  const { data: bandsRaw, error: bandsError } = await supabase
    .from("bands")
    .select("band_id, band_name");
  if (bandsError) {
    console.error("[fetchBandPreferSource] bands error:", bandsError);
    throw new Error(`Failed to load bands: ${bandsError.message}`);
  }
  const bands = (bandsRaw ?? []) as BandRow[];
  console.log("[fetchBandPreferSource] Loaded bands:", bands.length);

  // 2. band_membersテーブルからバンドとメンバーの紐付けを取得
  const { data: bandMembersRaw, error: bandMembersError } = await supabase
    .from("band_members")
    .select("band_id, member_id");
  if (bandMembersError) {
    console.error("[fetchBandPreferSource] band_members error:", bandMembersError);
    throw new Error(`Failed to load band members: ${bandMembersError.message}`);
  }
  const bandMembers = (bandMembersRaw ?? []) as BandMemberRow[];
  console.log("[fetchBandPreferSource] Loaded band_members:", bandMembers.length);

  // 3. 指定週のメンバー希望時間を先に取得
  const { data: memberPrefersRaw, error: memberPrefersError } = await supabase
    .from("members_prefer")
    .select("member_id, priority, updated_at")
    .eq("week_id", weekId);
  
  console.log("[fetchBandPreferSource] members_prefer query result:", {
    data: memberPrefersRaw,
    error: memberPrefersError,
    count: memberPrefersRaw?.length ?? 0
  });
  
  if (memberPrefersError) {
    console.error("[fetchBandPreferSource] members_prefer error:", memberPrefersError);
    throw new Error(
      `Failed to load members_prefer: ${memberPrefersError.message}`
    );
  }
  const memberPrefers = (memberPrefersRaw ?? []) as MemberPreferRow[];
  console.log("[fetchBandPreferSource] Loaded members_prefer:", memberPrefers.length);

  // members_preferに存在するmember_idのリストを取得
  const memberIdsInPrefer = Array.from(new Set(memberPrefers.map(p => p.member_id)));
  console.log("[fetchBandPreferSource] memberIdsInPrefer:", memberIdsInPrefer);

  // 4. membersテーブルから band_members に登場するメンバーの情報を取得
  const memberIdsInBands = Array.from(new Set(bandMembers.map((bm) => bm.member_id)));

  let members: MemberRow[] = [];
  if (memberIdsInBands.length > 0) {
    const { data: membersRaw, error: membersError } = await supabase
      .from("members")
      .select("member_id, practice_available")
      .in("member_id", memberIdsInBands);
    
    console.log("[fetchBandPreferSource] members query result:", {
      data: membersRaw,
      error: membersError,
      count: membersRaw?.length ?? 0
    });
    
    if (membersError) {
      console.error("[fetchBandPreferSource] members error:", membersError);
      // membersテーブルが空でもエラーにせず続行
      console.warn("[fetchBandPreferSource] Failed to load members, continuing without penalty check");
    } else {
      members = (membersRaw ?? []) as MemberRow[];
    }
  }
  console.log("[fetchBandPreferSource] Loaded members:", members.length);

  // バンドIDとバンド名のマッピング
  const bandNameById = new Map<number, string>();
  for (const band of bands) {
    bandNameById.set(band.band_id, band.band_name);
  }

  // バンドIDとメンバーIDのマッピング
  const membersByBand = new Map<number, number[]>();
  const bandIdsByMember = new Map<number, number[]>();

  for (const relation of bandMembers) {
    if (!bandNameById.has(relation.band_id)) continue;
    const list = membersByBand.get(relation.band_id);
    if (list) {
      list.push(relation.member_id);
    } else {
      membersByBand.set(relation.band_id, [relation.member_id]);
    }

    const bandIds = bandIdsByMember.get(relation.member_id);
    if (bandIds) {
      bandIds.push(relation.band_id);
    } else {
      bandIdsByMember.set(relation.member_id, [relation.band_id]);
    }
  }

  // practice_available が false の罰則メンバーを特定
  const penalizedMembers = new Set<number>();
  if (members.length > 0) {
    for (const member of members) {
      // practice_available が明示的に false の場合のみ罰則扱い
      if (member.practice_available === false) {
        penalizedMembers.add(member.member_id);
      }
    }
  }
  console.log("[fetchBandPreferSource] penalizedMembers:", Array.from(penalizedMembers));

  // メンバーIDと優先度行列のマッピング(最新のupdated_atを採用)
  const preferMatrixByMember = new Map<
    number,
    { matrix: NumberMatrix; updatedAt: string | null }
  >();
  for (const prefer of memberPrefers) {
    const matrix = parsePriorityMatrix(prefer.priority);
    if (!matrix) {
      console.log("[fetchBandPreferSource] Failed to parse priority for member:", prefer.member_id);
      continue;
    }

    const existing = preferMatrixByMember.get(prefer.member_id);
    if (
      !existing ||
      ((prefer.updated_at ?? "") > (existing.updatedAt ?? ""))
    ) {
      preferMatrixByMember.set(prefer.member_id, {
        matrix,
        updatedAt: prefer.updated_at ?? null,
      });
    }
  }
  console.log("[fetchBandPreferSource] preferMatrixByMember size:", preferMatrixByMember.size);

  for (const memberId of preferMatrixByMember.keys()) {
    if (!bandIdsByMember.has(memberId)) {
      console.log("[fetchBandPreferSource] prefer member not linked to any band", { memberId });
    }
  }

  // バンドごとにメンバーの優先度を集約
  const result: RawBandPreferEntry[] = [];

  for (const [bandId, memberIds] of membersByBand) {
    const bandName = bandNameById.get(bandId);
    if (!bandName) continue;

    // 重複排除
    const uniqueMemberIds = Array.from(new Set(memberIds));
    if (uniqueMemberIds.length === 0) continue;

    // 罰則メンバーがいる場合はバンドをスキップ
    if (uniqueMemberIds.some((memberId) => penalizedMembers.has(memberId))) {
      console.log("[fetchBandPreferSource] skip penalized", { bandId, bandName, memberIds: uniqueMemberIds });
      continue;
    }

  const aggregated = zeroMatrix();
  let hasContribution = false;

  const contributingMemberIds: number[] = [];

    // メンバー全員の優先度を合算
    for (const memberId of uniqueMemberIds) {
      const preferEntry = preferMatrixByMember.get(memberId);
      if (!preferEntry) {
        console.log("[fetchBandPreferSource] skip member (missing prefer)", { bandId, bandName, memberId });
        continue;
      }
      addMatrixInto(aggregated, preferEntry.matrix);
      contributingMemberIds.push(memberId);
      hasContribution = true;
    }

    if (!hasContribution || !hasAnyPositive(aggregated)) {
      console.log("[fetchBandPreferSource] skip band (no positive scores)", { bandId, bandName });
      continue;
    }

    console.log("[fetchBandPreferSource] contributing members", { bandId, bandName, memberIds: contributingMemberIds });
    result.push([bandName, aggregated]);
    console.log("[fetchBandPreferSource] Added band:", bandName);
  }

  // バンド名で昇順ソート
  result.sort((a, b) => a[0].localeCompare(b[0], "ja"));
  console.log("[fetchBandPreferSource] Final result count:", result.length);

  return result;

}

// 擬似的に practice_session テーブルへ保存した体裁の配列。
const dummyPracticeSessions: {
  week_id: number;
  bands_prefer_score: [string, NumberMatrix][];
  nice_prefer: NicePreferMatrix;
}[] = [];

/**
 * Supabase などから取得した生データを既定のフォーマットへそろえる。
 */
function buildBandPreferScores(raw: unknown): [string, NumberMatrix][] {
  return normalizeBandPreferEntries(raw);
}

/**
 * 練習時間をバンドに割り当てた最終 3 次元配列を生成する。
 * @remarks
 * - 各バンドは最大 2 コマまで。
 * - 同一時間帯で同一バンドを複数ロケーションへは割り当てない。
 * - 既に埋まっている時間帯には減点を適用し、低スコア候補を自然に排除する。
 */
function assignPracticeSlots(scores: [string, NumberMatrix][]): NicePreferMatrix {
  const matrix: NicePreferMatrix = Array.from({ length: DAYS }, () =>
    Array.from({ length: HOURS }, () => Array(LOCATION_COUNT).fill(0) as NicePreferEntry[])
  );

  type Candidate = {
    bandName: string;
    dayIndex: number;
    hourIndex: number;
    baseScore: number;
  };

  const candidates: Candidate[] = [];

  for (const [bandName, scoreMatrix] of scores) {

    for (let dayIndex = 0; dayIndex < DAYS; dayIndex += 1) {
      for (let hourIndex = 0; hourIndex < HOURS; hourIndex += 1) {
        const baseScore = scoreMatrix[dayIndex][hourIndex];
        if (baseScore > 0) {
          candidates.push({ bandName, dayIndex, hourIndex, baseScore });
        }
      }
    }
  }

  candidates.sort((a, b) => {
    if (b.baseScore !== a.baseScore) return b.baseScore - a.baseScore;
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    return a.hourIndex - b.hourIndex;
  });

  const bandAssignments = new Map<string, number>();

  for (const candidate of candidates) {
    const usage = bandAssignments.get(candidate.bandName) ?? 0;
    if (usage >= 2) continue;

    const slot = matrix[candidate.dayIndex][candidate.hourIndex];
    if (slot.includes(candidate.bandName)) continue;

    const occupiedCount = slot.filter((entry) => entry !== 0).length;
    const adjustedScore = candidate.baseScore - occupiedCount * 2;

    if (adjustedScore <= 0) continue;

    const freeIndex = slot.findIndex((entry) => entry === 0);
    if (freeIndex === -1) continue;

    slot[freeIndex] = candidate.bandName;
    bandAssignments.set(candidate.bandName, usage + 1);
  }

  return matrix;
}

// GET /api/bands-prefer?week_id=123
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const weekIdParam = url.searchParams.get("week_id");
    const weekId = weekIdParam ? Number(weekIdParam) : null;

    // 1. 生データを取得し、

    const rawBandPrefer = await fetchBandPreferSource(weekId);
    // 2. 正規化してからスコアリングルールに通す。
    const bandsPreferScore = buildBandPreferScores(rawBandPrefer);

    const nicePrefer = assignPracticeSlots(bandsPreferScore);

    if (weekId !== null && !Number.isNaN(weekId)) {
      const existing = dummyPracticeSessions.find((s) => s.week_id === weekId);
      if (existing) {
        existing.bands_prefer_score = JSON.parse(
          JSON.stringify(bandsPreferScore)
        );
        existing.nice_prefer = JSON.parse(JSON.stringify(nicePrefer));
      } else {
        dummyPracticeSessions.push({
          week_id: weekId,
          bands_prefer_score: JSON.parse(JSON.stringify(bandsPreferScore)),
          nice_prefer: JSON.parse(JSON.stringify(nicePrefer)),
        });
      }


    }

    console.log("[bands_prefer_score]", JSON.stringify(bandsPreferScore));
    console.log("[nice_prefer]", JSON.stringify(nicePrefer));

    return NextResponse.json({
      bands_prefer_score: bandsPreferScore,
      nice_prefer: nicePrefer,
    });

   } catch (error) {

    console.error("bands_prefer_score 生成エラー:", error);
    return NextResponse.json(
      { error: "Failed to build bands_prefer_score" },
      { status: 500 }
    );
  }

}

function countAssignedBands(matrix: NicePreferMatrix): number {
  const bands = new Set<string>();
  for (const day of matrix) {
    for (const hour of day) {
      for (const entry of hour) {
        if (typeof entry === "string") {
          bands.add(entry);
        }
      }
    }
  }
  return bands.size;
}

function countBandOccurrences(matrix: NicePreferMatrix): Map<string, number> {
  const counts = new Map<string, number>();
  for (const day of matrix) {
    for (const hour of day) {
      for (const entry of hour) {
        if (typeof entry === "string") {
          counts.set(entry, (counts.get(entry) ?? 0) + 1);
        }
      }
    }
  }
  return counts;
}

function logBandSlotCounts(matrix: NicePreferMatrix): void {
  const occurrences = countBandOccurrences(matrix);
  console.log(
    "[nice_prefer slot counts]",
    JSON.stringify(Object.fromEntries(occurrences), null, 2)
  );

}