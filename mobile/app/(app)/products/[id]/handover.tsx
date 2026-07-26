import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * Legacy route — the handover actions moved onto the PRODUCT CARD
 * (products/[id]/index.tsx). Kept as a param-preserving redirect so old
 * notification deep links keep working.
 */
export default function ProductHandoverRedirect() {
  const { id, scanned } = useLocalSearchParams<{
    id: string;
    scanned?: string;
  }>();
  return (
    <Redirect
      href={{
        pathname: "/products/[id]",
        params: { id, ...(scanned ? { scanned } : {}) },
      }}
    />
  );
}
