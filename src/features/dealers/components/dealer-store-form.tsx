"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateDealerStoreInfoAction } from "@/features/dealers/actions";

export interface DealerStoreFormProps {
  dealer: {
    id: string;
    code: string;
    name: string;
    address?: string | null;
    phone?: string | null;
    businessHours?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
}

export function DealerStoreForm({ dealer }: DealerStoreFormProps) {
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    start(async () => {
      const r = await updateDealerStoreInfoAction(formData);
      if (r.error) toast.error(r.error);
      else toast.success("매장 정보가 저장되었습니다.");
    });
  }

  return (
    <form action={submit} className="space-y-3">
      <input type="hidden" name="dealerId" value={dealer.id} />
      <p className="text-sm font-medium">
        {dealer.name}{" "}
        <span className="font-mono text-xs text-muted-foreground">({dealer.code})</span>
      </p>

      <div className="space-y-1.5">
        <Label htmlFor={`address-${dealer.id}`}>주소</Label>
        <Input
          id={`address-${dealer.id}`}
          name="address"
          defaultValue={dealer.address ?? ""}
          placeholder="서울특별시 강남구 ..."
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`phone-${dealer.id}`}>전화번호</Label>
        <Input
          id={`phone-${dealer.id}`}
          name="phone"
          defaultValue={dealer.phone ?? ""}
          placeholder="02-1234-5678"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`hours-${dealer.id}`}>영업시간</Label>
        <Textarea
          id={`hours-${dealer.id}`}
          name="businessHours"
          defaultValue={dealer.businessHours ?? ""}
          placeholder="평일 10:00–19:00, 일요일 휴무"
          rows={2}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`lat-${dealer.id}`}>위도</Label>
          <Input
            id={`lat-${dealer.id}`}
            name="latitude"
            type="number"
            step="any"
            defaultValue={dealer.latitude ?? ""}
            placeholder="37.4979"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`lng-${dealer.id}`}>경도</Label>
          <Input
            id={`lng-${dealer.id}`}
            name="longitude"
            type="number"
            step="any"
            defaultValue={dealer.longitude ?? ""}
            placeholder="127.0276"
          />
        </div>
      </div>

      <Button type="submit" size="sm" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        매장 정보 저장
      </Button>
    </form>
  );
}
