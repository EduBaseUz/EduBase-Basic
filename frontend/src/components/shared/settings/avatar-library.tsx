"use client";

import * as React from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import {
  useDefaultAvatars,
  useDeleteDefaultAvatar,
  useUploadDefaultAvatar,
} from "@/hooks/use-settings";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";
import type { AvatarGender } from "@/types";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

const GENDERS: { id: AvatarGender; label: string }[] = [
  { id: "male", label: "Erkak" },
  { id: "female", label: "Ayol" },
  { id: "both", label: "Ikkalasi" },
];

export function AvatarLibrary() {
  const { data: avatars, isLoading } = useDefaultAvatars();
  const upload = useUploadDefaultAvatar();
  const remove = useDeleteDefaultAvatar();
  const { toast } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Yuklash oqimi: fayl tanlanadi -> modal ochiladi -> jins tanlab saqlanadi.
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = React.useState<string | null>(null);
  const [gender, setGender] = React.useState<AvatarGender | null>(null);
  const [toDelete, setToDelete] = React.useState<string | null>(null);

  const onPick = () => inputRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast({
        title: "Xatolik",
        description: "Faqat JPG, PNG yoki WEBP rasm tanlang",
        variant: "error",
      });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({
        title: "Xatolik",
        description: "Rasm hajmi 5MB dan oshmasligi kerak",
        variant: "error",
      });
      return;
    }
    setPendingFile(file);
    setPendingPreview(URL.createObjectURL(file));
    setGender(null);
  };

  const closeModal = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    setPendingFile(null);
    setPendingPreview(null);
    setGender(null);
  };

  const onConfirmUpload = async () => {
    if (!pendingFile || !gender) return;
    try {
      await upload.mutateAsync({ file: pendingFile, gender });
      toast({ title: "Rasm qo'shildi", variant: "success" });
      closeModal();
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    }
  };

  const onConfirmDelete = async () => {
    if (!toDelete) return;
    try {
      await remove.mutateAsync(toDelete);
      toast({ title: "Rasm o'chirildi", variant: "success" });
    } catch (err) {
      toast({
        title: "Xatolik",
        description: err instanceof ApiError ? err.message : "Xatolik",
        variant: "error",
      });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Standart avatarlar</CardTitle>
        <CardDescription>
          Yangi foydalanuvchi rasmsiz yaratilganda, jinsiga mos rasmlardan biri
          (yoki &quot;Ikkalasi&quot;) unga avtomatik biriktiriladi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <button
          type="button"
          onClick={onPick}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          <ImagePlus className="h-6 w-6" />
          <span className="text-sm font-medium">Rasm yuklash</span>
          <span className="text-xs">JPG, PNG yoki WEBP · maksimum 5MB</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onFile}
        />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yuklanmoqda...</p>
        ) : (
          GENDERS.map((g) => {
            const items = (avatars ?? []).filter((a) => a.gender === g.id);
            return (
              <div key={g.id}>
                <p className="mb-3 text-sm font-medium">
                  {g.label}{" "}
                  <span className="text-muted-foreground">({items.length})</span>
                </p>
                {items.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                    {items.map((a) => (
                      <div
                        key={a.id}
                        className="group relative aspect-square overflow-hidden rounded-lg border bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setToDelete(a.id)}
                          className="absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white opacity-0 transition-all hover:bg-destructive group-hover:opacity-100"
                          aria-label="Rasmni o'chirish"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed py-6 text-center text-xs text-muted-foreground">
                    Rasm yo'q
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      {/* Jins tanlash modali */}
      <Dialog
        open={pendingFile !== null}
        onOpenChange={(o) => {
          if (!o) closeModal();
        }}
      >
        <DialogContent onClose={closeModal} className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Qaysi jinsga yuklaysiz?</DialogTitle>
          </DialogHeader>
          {pendingPreview && (
            <div className="mx-auto mb-2 h-24 w-24 overflow-hidden rounded-full border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingPreview}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2">
            {GENDERS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGender(g.id)}
                className={cn(
                  "rounded-md border px-2 py-2 text-sm font-medium transition-colors",
                  gender === g.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Bekor qilish
            </Button>
            <Button onClick={onConfirmUpload} disabled={!gender || upload.isPending}>
              {upload.isPending ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
        }}
        title="Rasmni o'chirish"
        description="Bu rasm AWS S3 va ma'lumotlar bazasidan butunlay o'chiriladi."
        confirmLabel="O'chirish"
        variant="destructive"
        loading={remove.isPending}
        onConfirm={onConfirmDelete}
      />
    </Card>
  );
}
