"use client";

import { APIProvider, Library } from "@vis.gl/react-google-maps";

const LIBRARIES: Library[] = ["visualization"];

export default function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  // Use a placeholder if no key is provided in env yet.
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "AIzaSy_YOUR_PLACEHOLDER_KEY";
  
  return (
    <APIProvider apiKey={apiKey} libraries={LIBRARIES} onLoad={() => console.log('Maps API has loaded.')}>
      {children}
    </APIProvider>
  );
}
