'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LibrarianPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/librarian/overview');
  }, [router]);

  return null;
}

