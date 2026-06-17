"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useMyGroups } from "@/hooks/use-academic";
import { useGroupRating } from "@/hooks/use-groups";
import { useMe } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export default function RatingPage() {
  const { data: groups } = useMyGroups();
  const { data: me } = useMe();
  const [groupId, setGroupId] = React.useState("");

  React.useEffect(() => {
    if (!groupId && groups?.length) setGroupId(groups[0].id);
  }, [groups, groupId]);

  const { data: rating, isLoading } = useGroupRating(groupId || undefined);

  return (
    <div>
      <PageHeader
        title="Reyting"
        description="Guruh bo'yicha o'quvchilar reytingi"
      />

      <div className="mb-6 max-w-xs">
        <Label>Guruh</Label>
        <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          <option value="">— Tanlang —</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
          ) : !rating?.length ? (
            <p className="text-sm text-muted-foreground">
              Ma'lumot topilmadi.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">O'rin</TableHead>
                  <TableHead>O'quvchi</TableHead>
                  <TableHead>O'rtacha baho (20 dan)</TableHead>
                  <TableHead>Davomat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rating.map((r) => (
                  <TableRow
                    key={r.studentId}
                    className={cn(
                      me?.id === r.studentId && "bg-secondary font-medium",
                    )}
                  >
                    <TableCell>
                      {r.rank <= 3 ? (
                        <Badge variant={r.rank === 1 ? "success" : "secondary"}>
                          {r.rank}
                        </Badge>
                      ) : (
                        r.rank
                      )}
                    </TableCell>
                    <TableCell>
                      {r.fullName}
                      {me?.id === r.studentId && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (siz)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{r.average.toFixed(1)}</TableCell>
                    <TableCell>
                      {Math.round(r.attendanceRatio * 100)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
