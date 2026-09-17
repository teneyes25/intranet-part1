"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  GitFork,
  Home,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DEFAULT_NAMES,
  DEFAULT_RESULTS,
  PLAYER_COLORS,
  PLAYER_COUNT,
  RESULT_PRESETS,
  RUNG_ROWS,
  type ResultPresetKey,
} from "@/features/ladder/constants";
import { LadderCanvas } from "@/features/ladder/components/ladder-canvas";
import { createGeometry } from "@/features/ladder/ladder-geometry";
import {
  followPath,
  generateLadder,
  mulberry32,
  resolveAll,
  shuffled,
  type LadderPath,
  type Rung,
} from "@/features/ladder/ladder-engine";

const INITIAL_RUNGS = generateLadder(PLAYER_COUNT, RUNG_ROWS, mulberry32(20260917));

export function LadderGame() {
  const geom = useMemo(() => createGeometry(PLAYER_COUNT, RUNG_ROWS), []);
  const [names, setNames] = useState<string[]>(() => [...DEFAULT_NAMES]);
  const [results, setResults] = useState<string[]>(() => [...DEFAULT_RESULTS]);
  const [preset, setPreset] = useState<ResultPresetKey>("default");
  const [rungs, setRungs] = useState<Rung[]>(INITIAL_RUNGS);
  const [hideResults, setHideResults] = useState(false);
  const [revealed, setRevealed] = useState<Partial<Record<number, number>>>({});
  const [activePath, setActivePath] = useState<LadderPath | null>(null);
  const [animating, setAnimating] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [seedTick, setSeedTick] = useState(1);
  const activePathRef = useRef<LadderPath | null>(null);

  const allPaths = useMemo(() => {
    if (!showAll) return [];
    return Array.from({ length: PLAYER_COUNT }, (_, start) =>
      followPath(start, rungs, PLAYER_COUNT, RUNG_ROWS),
    );
  }, [rungs, showAll]);

  const mapping = useMemo(
    () => resolveAll(rungs, PLAYER_COUNT, RUNG_ROWS),
    [rungs],
  );

  const updateName = (index: number, value: string) => {
    setNames((prev) => prev.map((name, i) => (i === index ? value : name)));
  };

  const updateResult = (index: number, value: string) => {
    setResults((prev) => prev.map((item, i) => (i === index ? value : item)));
  };

  const clearRun = () => {
    activePathRef.current = null;
    setActivePath(null);
    setAnimating(false);
    setShowAll(false);
    setRevealed({});
  };

  const redrawLadder = () => {
    setRungs(generateLadder(PLAYER_COUNT, RUNG_ROWS));
    setSeedTick((n) => n + 1);
    clearRun();
  };

  const applyPreset = (key: ResultPresetKey) => {
    setPreset(key);
    setResults([...RESULT_PRESETS[key].values]);
    clearRun();
  };

  const handleAnimationEnd = useCallback(() => {
    setAnimating(false);
    const path = activePathRef.current;
    if (!path) return;
    setRevealed((prev) => ({ ...prev, [path.startCol]: path.endCol }));
  }, []);

  const ride = (startCol: number) => {
    if (animating) return;
    const path = followPath(startCol, rungs, PLAYER_COUNT, RUNG_ROWS);
    activePathRef.current = path;
    setShowAll(false);
    setActivePath(path);
    setAnimating(true);
  };

  const revealAll = () => {
    if (animating) return;
    const next: Record<number, number> = {};
    mapping.forEach((end, start) => {
      next[start] = end;
    });
    setRevealed(next);
    setShowAll(true);
    activePathRef.current = null;
    setActivePath(null);
    setAnimating(false);
  };

  const resetAll = () => {
    setNames([...DEFAULT_NAMES]);
    setPreset("default");
    setResults([...DEFAULT_RESULTS]);
    setHideResults(false);
    setRungs(generateLadder(PLAYER_COUNT, RUNG_ROWS, mulberry32(20260917 + seedTick)));
    clearRun();
  };

  const revealedEntries = Object.entries(revealed)
    .map(([start, end]) => ({
      start: Number(start),
      end: end as number,
    }))
    .sort((a, b) => a.start - b.start);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.12),_transparent_42%),hsl(var(--background))]">
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-brand-light">
              <GitFork className="h-3.5 w-3.5" />
              Ladder Game
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-navy-900 dark:text-foreground">
              12명 사다리 게임
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
              참가자 아래 타기 버튼을 누르면 사다리를 타고 내려갑니다.
              이름과 결과칸은 직접 바꾸거나 프리셋으로 채울 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="h-8 gap-1 px-3">
              <Users className="h-3.5 w-3.5" />
              참가 {PLAYER_COUNT}명 고정
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">
                <Home className="h-4 w-4" />
                인트라넷
              </Link>
            </Button>
          </div>
        </header>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">게임 설정</CardTitle>
            <CardDescription>
              사다리를 다시 그리거나 결과 구성을 바꾼 뒤 한 명씩 타 보세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[220px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="ladder-preset">결과 프리셋</Label>
                <Select
                  value={preset}
                  onValueChange={(value) => applyPreset(value as ResultPresetKey)}
                >
                  <SelectTrigger id="ladder-preset" className="w-full">
                    <SelectValue placeholder="프리셋 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RESULT_PRESETS).map(([key, item]) => (
                      <SelectItem key={key} value={key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Button onClick={redrawLadder} disabled={animating}>
                  <Shuffle className="h-4 w-4" />
                  사다리 다시 그리기
                </Button>
                <Button
                  variant="outline"
                  disabled={animating}
                  onClick={() => {
                    setNames(shuffled(names));
                    clearRun();
                  }}
                >
                  <Users className="h-4 w-4" />
                  이름 섞기
                </Button>
                <Button
                  variant="outline"
                  disabled={animating}
                  onClick={() => {
                    setResults(shuffled(results));
                    clearRun();
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  결과 섞기
                </Button>
                <Button variant="outline" onClick={revealAll} disabled={animating}>
                  <Eye className="h-4 w-4" />
                  전체 결과
                </Button>
                <Button
                  variant="outline"
                  disabled={animating}
                  onClick={() => setHideResults((v) => !v)}
                >
                  {hideResults ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  {hideResults ? "결과 보이기" : "결과 가리기"}
                </Button>
                <Button variant="ghost" onClick={resetAll} disabled={animating}>
                  <RotateCcw className="h-4 w-4" />
                  초기화
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardContent className="p-4 md:p-6">
            <div className="overflow-x-auto pb-2">
              <div className="mx-auto" style={{ width: geom.width }}>
                <div className="relative mb-3 h-[92px]">
                  {names.map((name, index) => {
                    const color = PLAYER_COLORS[index]!;
                    const done = revealed[index] !== undefined;
                    return (
                      <div
                        key={`name-${index}`}
                        className="absolute flex w-[72px] -translate-x-1/2 flex-col items-center gap-1"
                        style={{ left: geom.padX + index * geom.colGap }}
                      >
                        <Label htmlFor={`ladder-name-${index}`} className="sr-only">
                          참가자 {index + 1} 이름
                        </Label>
                        <Input
                          id={`ladder-name-${index}`}
                          value={name}
                          onChange={(e) => updateName(index, e.target.value)}
                          className="h-8 px-1.5 text-center text-xs"
                          style={{ borderColor: `${color}55` }}
                        />
                        <Button
                          size="sm"
                          disabled={animating}
                          onClick={() => ride(index)}
                          className="h-7 px-2 text-[11px]"
                          style={{ backgroundColor: color }}
                          aria-label={`${name || `참가자 ${index + 1}`} 타기`}
                        >
                          <Play className="h-3 w-3" />
                          {done ? "다시" : "타기"}
                        </Button>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-2xl border border-border/70 bg-card/80 px-1 py-2 shadow-inner">
                  <LadderCanvas
                    rungs={rungs}
                    geom={geom}
                    activePath={activePath}
                    ghostPaths={allPaths}
                    animating={animating}
                    onAnimationEnd={handleAnimationEnd}
                  />
                </div>

                <div className="relative mt-3 h-[58px]">
                  {results.map((result, index) => {
                    const landed = Object.entries(revealed).find(
                      ([, end]) => end === index,
                    );
                    const color = landed
                      ? PLAYER_COLORS[Number(landed[0])]
                      : undefined;
                    const hidden = hideResults && !landed;
                    return (
                      <div
                        key={`result-${index}`}
                        className="absolute w-[72px] -translate-x-1/2"
                        style={{ left: geom.padX + index * geom.colGap }}
                      >
                        <Label htmlFor={`ladder-result-${index}`} className="sr-only">
                          결과 {index + 1}
                        </Label>
                        <Input
                          id={`ladder-result-${index}`}
                          value={hidden ? "???" : result}
                          readOnly={hidden}
                          onChange={(e) => updateResult(index, e.target.value)}
                          className="h-9 px-1.5 text-center text-xs font-medium"
                          style={
                            color
                              ? {
                                  borderColor: color,
                                  boxShadow: `0 0 0 2px ${color}33`,
                                }
                              : undefined
                          }
                          aria-label={`결과 ${index + 1}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">매칭 결과</CardTitle>
            <CardDescription>
              {revealedEntries.length === 0
                ? "아직 탄 사람이 없습니다. 참가자 아래 타기 버튼을 눌러 보세요."
                : `${revealedEntries.length}명의 결과가 공개되었습니다.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revealedEntries.length === 0 ? (
              <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                사다리를 타면 이곳에 이름과 결과가 쌓입니다.
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="ladder-results">
                {revealedEntries.map(({ start, end }) => {
                  const color = PLAYER_COLORS[start]!;
                  return (
                    <li
                      key={`match-${start}`}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 px-3 py-2.5 text-sm"
                      style={{ borderColor: `${color}44` }}
                    >
                      <span className="truncate font-medium" style={{ color }}>
                        {names[start] || `참가자 ${start + 1}`}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="truncate font-semibold">
                        {results[end] || `결과 ${end + 1}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
