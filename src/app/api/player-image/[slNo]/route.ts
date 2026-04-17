import { NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ slNo: string }>;
};

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "avif"] as const;
const RESOLVED_IMAGE_CACHE = new Map<string, { url: string | null; expiresAt: number }>();
const RESOLVED_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours
const MISSING_CACHE_TTL_MS = 1000 * 60 * 5; // 5 minutes
const MANIFEST_CACHE_TTL_MS = 1000 * 60 * 10; // 10 minutes

let MANIFEST_CACHE: {
  map: Record<string, string> | null;
  expiresAt: number;
  sourceUrl: string;
} = {
  map: null,
  expiresAt: 0,
  sourceUrl: "",
};

const getSupabasePublicImageBase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const bucket =
    process.env.PLAYER_IMAGES_BUCKET ??
    process.env.NEXT_PUBLIC_PLAYER_IMAGES_BUCKET ??
    "player-images";

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is required to resolve player images.");
  }

  return {
    bucket,
    baseUrl: `${supabaseUrl}/storage/v1/object/public/${bucket}`,
    manifestPath:
      process.env.PLAYER_IMAGES_MANIFEST_PATH ??
      process.env.NEXT_PUBLIC_PLAYER_IMAGES_MANIFEST_PATH ??
      "player-image-manifest.json",
    manifestStrict: (process.env.PLAYER_IMAGES_MANIFEST_STRICT ?? "true").toLowerCase() !== "false",
  };
};

const getCachedResolution = (serial: string): string | null | undefined => {
  const cached = RESOLVED_IMAGE_CACHE.get(serial);
  if (!cached) {
    return undefined;
  }

  if (Date.now() > cached.expiresAt) {
    RESOLVED_IMAGE_CACHE.delete(serial);
    return undefined;
  }

  return cached.url;
};

const setCachedResolution = (serial: string, url: string | null) => {
  RESOLVED_IMAGE_CACHE.set(serial, {
    url,
    expiresAt: Date.now() + (url ? RESOLVED_CACHE_TTL_MS : MISSING_CACHE_TTL_MS),
  });
};

const normalizeManifest = (raw: unknown): Record<string, string> | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  // Format A: { "1": "1.webp", "2": "2.jpg" }
  if (!Array.isArray(raw)) {
    const objectEntries = Object.entries(raw as Record<string, unknown>);
    const normalizedEntries = objectEntries
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => [String(key).trim(), (value as string).trim()] as const)
      .filter(([key]) => key.length > 0);

    if (normalizedEntries.length > 0) {
      return Object.fromEntries(normalizedEntries);
    }
  }

  // Format B: [{ "slNo": 1, "fileName": "1.webp" }, ...]
  if (Array.isArray(raw)) {
    const rows = raw as Array<Record<string, unknown>>;
    const normalizedEntries = rows
      .map((row) => {
        const key = row.slNo ?? row.sl_no ?? row.id ?? row.playerNumber;
        const fileName = row.fileName ?? row.file_name ?? row.path ?? row.url;
        if ((typeof key === "number" || typeof key === "string") && typeof fileName === "string" && fileName.trim()) {
          return [String(key).trim(), fileName.trim()] as const;
        }
        return null;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry));

    if (normalizedEntries.length > 0) {
      return Object.fromEntries(normalizedEntries);
    }
  }

  return null;
};

const resolveManifestValueToUrl = (value: string, baseUrl: string): string => {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${baseUrl}/${value.replace(/^\/+/, "")}`;
};

const loadManifestMap = async (manifestUrl: string): Promise<Record<string, string> | null> => {
  const isCacheValid = Date.now() < MANIFEST_CACHE.expiresAt && MANIFEST_CACHE.sourceUrl === manifestUrl;
  if (isCacheValid) {
    return MANIFEST_CACHE.map;
  }

  try {
    const response = await fetch(manifestUrl, {
      method: "GET",
      cache: "force-cache",
    });

    if (!response.ok) {
      MANIFEST_CACHE = {
        map: null,
        sourceUrl: manifestUrl,
        expiresAt: Date.now() + MISSING_CACHE_TTL_MS,
      };
      return null;
    }

    const data = (await response.json()) as unknown;
    const normalized = normalizeManifest(data);

    MANIFEST_CACHE = {
      map: normalized,
      sourceUrl: manifestUrl,
      expiresAt: Date.now() + MANIFEST_CACHE_TTL_MS,
    };

    return normalized;
  } catch {
    MANIFEST_CACHE = {
      map: null,
      sourceUrl: manifestUrl,
      expiresAt: Date.now() + MISSING_CACHE_TTL_MS,
    };
    return null;
  }
};

export async function GET(_: Request, { params }: RouteParams) {
  try {
    const { slNo } = await params;
    const normalized = Number(slNo);

    if (!Number.isFinite(normalized) || normalized <= 0) {
      return NextResponse.json({ message: "Invalid player serial number." }, { status: 400 });
    }

    const serial = String(Math.trunc(normalized));
    const { baseUrl, bucket, manifestPath, manifestStrict } = getSupabasePublicImageBase();

    const cachedUrl = getCachedResolution(serial);
    if (cachedUrl !== undefined) {
      if (cachedUrl) {
        return NextResponse.redirect(cachedUrl, {
          status: 307,
          headers: {
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }

      return NextResponse.json(
        {
          message: `No player image found for #${serial} in bucket '${bucket}'. Expected ${serial}.png/.jpg/.jpeg/.webp/.avif`,
        },
        { status: 404 },
      );
    }

    // Manifest-first lookup: O(1) resolution with no extension probing.
    const manifestUrl = `${baseUrl}/${manifestPath.replace(/^\/+/, "")}`;
    const manifestMap = await loadManifestMap(manifestUrl);

    if (manifestMap) {
      const manifestValue = manifestMap[serial];
      if (manifestValue) {
        const resolvedUrl = resolveManifestValueToUrl(manifestValue, baseUrl);
        setCachedResolution(serial, resolvedUrl);

        return NextResponse.redirect(resolvedUrl, {
          status: 307,
          headers: {
            "Cache-Control": "public, max-age=86400, s-maxage=86400",
          },
        });
      }

      if (manifestStrict) {
        setCachedResolution(serial, null);
        return NextResponse.json(
          {
            message: `No player image found for #${serial} in manifest '${manifestPath}'.`,
          },
          { status: 404 },
        );
      }
    }

    const candidates = IMAGE_EXTENSIONS.map((ext) => {
      const fileName = `${serial}.${ext}`;
      const candidateUrl = `${baseUrl}/${fileName}`;
      return { ext, url: candidateUrl };
    });

    const probeResults = await Promise.all(
      candidates.map(async (candidate) => {
        const response = await fetch(candidate.url, {
          method: "HEAD",
          cache: "force-cache",
        });

        return {
          ...candidate,
          ok: response.ok,
        };
      }),
    );

    const found = probeResults.find((result) => result.ok);

    if (found) {
      setCachedResolution(serial, found.url);
      return NextResponse.redirect(found.url, {
        status: 307,
        headers: {
          // Cache resolved redirect aggressively to avoid repeated extension checks.
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      });
    }

    setCachedResolution(serial, null);

    return NextResponse.json(
      {
        message: `No player image found for #${serial} in bucket '${bucket}'. Expected ${serial}.png/.jpg/.jpeg/.webp/.avif`,
      },
      { status: 404 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to resolve player image.";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function HEAD(request: Request, context: RouteParams) {
  const response = await GET(request, context);
  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}
