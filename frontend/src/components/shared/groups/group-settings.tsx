"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { useToast } from "@/components/ui/toast";
import {
  useGroup,
  useGroups,
  useSetGroupMentors,
  useAddStudent,
  useRemoveStudent,
  useMoveStudent,
  usePromoteStudents,
  type PromotionItem,
} from "@/hooks/use-groups";
import { useUsers } from "@/hooks/use-users";
import { ApiError } from "@/lib/api";
import { formatPhoneDisplay, formatDate } from "@/lib/utils";
import { GROUP_BASE } from "@/components/shared/groups/group-config";

type Tab = "mentors" | "students" | "move" | "promote";

export function GroupSettings({ id }: { id: string }) {
  const { data, isLoading } = useGroup(id);
  const [tab, setTab] = React.useState<Tab>("mentors");

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={data ? `Sozlamalar — ${data.group.name}` : "Guruh sozlamalari"}
        action={
          <Link
            href={GROUP_BASE}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            <ArrowLeft className="h-4 w-4" /> Orqaga
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["mentors", "Mentorlar"],
            ["students", "Talabalar"],
            ["promote", "Sinov / Ko'chirish"],
            ["move", "Yakka ko'chirish"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            size="sm"
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
      ) : tab === "mentors" ? (
        <MentorsTab id={id} mentorIds={data.group.mentorIds} />
      ) : tab === "students" ? (
        <StudentsTab id={id} />
      ) : tab === "promote" ? (
        <PromotionTab id={id} />
      ) : (
        <MoveTab id={id} />
      )}
    </div>
  );
}

function MentorsTab({ id, mentorIds }: { id: string; mentorIds: string[] }) {
  const { data: mentors } = useUsers({ role: "mentor" });
  const setMentors = useSetGroupMentors();
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");

  const current = new Set(mentorIds);
  const all = mentors?.items ?? [];
  const term = search.trim().toLowerCase();
  const candidates = all.filter(
    (m) =>
      !current.has(m.id) &&
      (term === "" ||
        m.fullName.toLowerCase().includes(term) ||
        m.phone.includes(term)),
  );
  const added = all.filter((m) => current.has(m.id));

  const save = async (ids: string[]) => {
    try {
      await setMentors.mutateAsync({ id, mentorIds: ids });
      toast({ title: "Saqlandi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mentorlar</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label>Mentor qidirish</Label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Ism yoki telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {term !== "" && (
            <div className="mt-2 divide-y rounded-md border">
              {candidates.length ? (
                candidates.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>
                      {m.fullName}{" "}
                      <span className="text-muted-foreground">
                        {formatPhoneDisplay(m.phone)}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => save([...mentorIds, m.id])}
                      disabled={setMentors.isPending}
                    >
                      <Plus className="h-4 w-4" /> Qo'shish
                    </Button>
                  </div>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Topilmadi.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <Label>Guruh mentorlari</Label>
          <div className="mt-2 divide-y rounded-md border">
            {added.length ? (
              added.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>
                    {m.fullName}{" "}
                    <span className="text-muted-foreground">
                      {formatPhoneDisplay(m.phone)}
                    </span>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => save(mentorIds.filter((x) => x !== m.id))}
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                Mentor biriktirilmagan.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentsTab({ id }: { id: string }) {
  const { data } = useGroup(id);
  const { data: students } = useUsers({ role: "student" });
  const addStudent = useAddStudent();
  const removeStudent = useRemoveStudent();
  const { toast } = useToast();
  const [search, setSearch] = React.useState("");

  const enrolled = (data?.students ?? []).filter(
    (s) => s.enrollment.status === "active",
  );
  const enrolledIds = new Set(enrolled.map((s) => s.user.id));
  const term = search.trim().toLowerCase();
  const candidates = (students?.items ?? []).filter(
    (s) =>
      !enrolledIds.has(s.id) &&
      term !== "" &&
      (s.fullName.toLowerCase().includes(term) || s.phone.includes(term)),
  );

  const onAdd = async (studentId: string) => {
    try {
      await addStudent.mutateAsync({ id, studentId });
      toast({ title: "O'quvchi qo'shildi", variant: "success" });
      setSearch("");
    } catch (err) {
      toast({
        title: "Qo'shib bo'lmadi",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const onRemove = async (studentId: string) => {
    try {
      await removeStudent.mutateAsync({ id, studentId });
      toast({ title: "Chiqarildi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Talabalar ({enrolled.length}/{data?.group.studentLimit ?? 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <Label>Talaba qidirish</Label>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Ism yoki telefon..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {term !== "" && (
            <div className="mt-2 divide-y rounded-md border">
              {candidates.length ? (
                candidates.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 text-sm"
                  >
                    <span>
                      {s.fullName}{" "}
                      <span className="text-muted-foreground">
                        {formatPhoneDisplay(s.phone)}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAdd(s.id)}
                      disabled={addStudent.isPending}
                    >
                      <Plus className="h-4 w-4" /> Qo'shish
                    </Button>
                  </div>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Topilmadi.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <Label>Guruh o'quvchilari</Label>
          {!enrolled.length ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Hozircha o'quvchi yo'q.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>T/R</TableHead>
                  <TableHead>F.I.O.</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Qo'shilgan sana</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrolled.map((s, i) => (
                  <TableRow key={s.user.id}>
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.user.fullName}
                    </TableCell>
                    <TableCell>{formatPhoneDisplay(s.user.phone)}</TableCell>
                    <TableCell>{formatDate(s.enrollment.joinedAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemove(s.user.id)}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function MoveTab({ id }: { id: string }) {
  const { data } = useGroup(id);
  const { data: groups } = useGroups();
  const moveStudent = useMoveStudent();
  const { toast } = useToast();
  const [studentId, setStudentId] = React.useState("");
  const [toGroupId, setToGroupId] = React.useState("");

  const enrolled = (data?.students ?? []).filter(
    (s) => s.enrollment.status === "active",
  );
  const otherGroups = (groups?.items ?? []).filter((g) => g.id !== id);

  const onMove = async () => {
    if (!studentId || !toGroupId) {
      toast({ title: "Talaba va guruhni tanlang", variant: "error" });
      return;
    }
    try {
      await moveStudent.mutateAsync({ id, studentId, toGroupId });
      toast({ title: "O'quvchi ko'chirildi", variant: "success" });
      setStudentId("");
      setToGroupId("");
    } catch (err) {
      toast({
        title: "Ko'chirib bo'lmadi",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Boshqa guruhga ko'chirish</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>O'quvchi</Label>
          <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
            <option value="">— Tanlang —</option>
            {enrolled.map((s) => (
              <option key={s.user.id} value={s.user.id}>
                {s.user.fullName} ({formatPhoneDisplay(s.user.phone)})
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Yangi guruh</Label>
          <Select value={toGroupId} onChange={(e) => setToGroupId(e.target.value)}>
            <option value="">— Tanlang —</option>
            {otherGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
        <Button
          onClick={onMove}
          disabled={moveStudent.isPending || !studentId || !toGroupId}
        >
          Ko'chirish
        </Button>
        <p className="text-xs text-muted-foreground">
          O'quvchi joriy guruhdan chiqarilib, tanlangan guruhga bugungi sana bilan
          qo'shiladi.
        </p>
      </CardContent>
    </Card>
  );
}

type Decision = "stay" | "passed" | "repeat";

function PromotionTab({ id }: { id: string }) {
  const { data } = useGroup(id);
  const { data: groups } = useGroups();
  const promote = usePromoteStudents();
  const { toast } = useToast();

  const [decisions, setDecisions] = React.useState<Record<string, Decision>>({});
  const [passTarget, setPassTarget] = React.useState("");
  const [failTarget, setFailTarget] = React.useState("");

  const enrolled = (data?.students ?? []).filter(
    (s) => s.enrollment.status === "active",
  );
  const otherGroups = (groups?.items ?? []).filter((g) => g.id !== id);

  const setDecision = (studentId: string, d: Decision) =>
    setDecisions((prev) => ({ ...prev, [studentId]: d }));

  const movers = enrolled.filter(
    (s) => (decisions[s.user.id] ?? "stay") !== "stay",
  );

  const onApply = async () => {
    const needPass = movers.some((s) => decisions[s.user.id] === "passed");
    const needFail = movers.some((s) => decisions[s.user.id] === "repeat");
    if (movers.length === 0) {
      toast({ title: "Hech kim tanlanmagan", variant: "error" });
      return;
    }
    if (needPass && !passTarget) {
      toast({ title: "O'tganlar uchun guruhni tanlang", variant: "error" });
      return;
    }
    if (needFail && !failTarget) {
      toast({ title: "Yiqilganlar uchun guruhni tanlang", variant: "error" });
      return;
    }
    const items: PromotionItem[] = movers.map((s) => {
      const outcome = decisions[s.user.id] as "passed" | "repeat";
      return {
        studentId: s.user.id,
        outcome,
        targetGroupId: outcome === "passed" ? passTarget : failTarget,
      };
    });
    try {
      await promote.mutateAsync({ id, items });
      toast({ title: "Ko'chirildi", variant: "success" });
      setDecisions({});
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sinov natijasi va ko'chirish</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Har bir o'quvchi uchun natijani belgilang. &quot;O'tdi&quot; va
          &quot;Yiqildi&quot; tanlanganlar mos guruhga ko'chiriladi; joriy guruhdagi
          yozuvi tarix sifatida saqlanadi.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>O'tganlar uchun guruh</Label>
            <Select
              value={passTarget}
              onChange={(e) => setPassTarget(e.target.value)}
            >
              <option value="">— Tanlang —</option>
              {otherGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Yiqilganlar uchun guruh</Label>
            <Select
              value={failTarget}
              onChange={(e) => setFailTarget(e.target.value)}
            >
              <option value="">— Tanlang —</option>
              {otherGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {!enrolled.length ? (
          <p className="text-sm text-muted-foreground">Guruhda o'quvchi yo'q.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>T/R</TableHead>
                <TableHead>F.I.O.</TableHead>
                <TableHead>Natija</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrolled.map((s, i) => {
                const d = decisions[s.user.id] ?? "stay";
                return (
                  <TableRow key={s.user.id}>
                    <TableCell className="text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.user.fullName}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={d}
                        onChange={(e) =>
                          setDecision(s.user.id, e.target.value as Decision)
                        }
                        className="max-w-[12rem]"
                      >
                        <option value="stay">Qoladi</option>
                        <option value="passed">O&apos;tdi</option>
                        <option value="repeat">Yiqildi</option>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Ko'chiriladiganlar: {movers.length} ta
          </p>
          <Button
            onClick={onApply}
            disabled={promote.isPending || movers.length === 0}
          >
            Qo'llash
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
