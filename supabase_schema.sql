-- CONFIGURATION SUPABASE (SPEC 19)
CREATE TYPE wine_color AS ENUM ('red', 'white', 'rose');
CREATE TYPE wine_style AS ENUM ('still', 'sparkling');
CREATE TYPE wine_sweetness AS ENUM ('dry', 'sweet');

CREATE TABLE cellars (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('refrigerated', 'classic')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE storage_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cellar_id UUID REFERENCES cellars(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL
);

CREATE TABLE wines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    country TEXT,
    region TEXT,
    appellation TEXT,
    vintage INTEGER,
    color wine_color,
    style wine_style,
    sweetness wine_sweetness,
    peak_date INTEGER,
    image_url TEXT,
    grapes TEXT,
    producer_url TEXT,
    is_1859_classified BOOLEAN DEFAULT FALSE
);

CREATE TABLE bottles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wine_id UUID REFERENCES wines(id) ON DELETE CASCADE,
    storage_unit_id UUID REFERENCES storage_units(id) ON DELETE CASCADE,
    pos_x INTEGER NOT NULL,
    pos_y INTEGER NOT NULL,
    status TEXT DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'removed'))
);

CREATE TABLE consumption_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bottle_id UUID REFERENCES bottles(id),
    reason TEXT,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bucket Supabase Storage pour les photos d'étiquettes (Spec 13/16)
-- À créer dans le dashboard Supabase : Storage > New bucket > "wine-labels" (public)
-- Puis ajouter cette policy RLS pour le bucket :
--
-- Policy INSERT (upload) :
--   bucket_id = 'wine-labels' AND auth.uid()::text = (storage.foldername(name))[1]
--
-- Policy SELECT (lecture publique) :
--   bucket_id = 'wine-labels'
