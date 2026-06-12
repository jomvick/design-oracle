"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function AnalysisIdPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;

  useEffect(() => {
    if (id) {
      router.replace(`/dashboard/overview?id=${id}`);
    } else {
      router.replace("/");
    }
  }, [id, router]);

  return null;
}
