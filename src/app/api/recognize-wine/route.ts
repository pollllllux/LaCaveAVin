import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MONTHLY_SCAN_LIMIT = 1000;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Créer client Supabase côté serveur
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Vérifier la limite mensuelle
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const { data: counter, error: getError } = await supabase
      .from('api_usage')
      .select('scan_count')
      .eq('month', monthKey)
      .single();

    if (getError && getError.code !== 'PGRST116') {
      throw getError;
    }

    const currentCount = counter?.scan_count || 0;

    if (currentCount >= MONTHLY_SCAN_LIMIT) {
      return NextResponse.json(
        { error: `Limite mensuelle de ${MONTHLY_SCAN_LIMIT} scans atteinte.` },
        { status: 429 }
      );
    }

    // Incrémenter ou créer le compteur
    if (counter) {
      await supabase
        .from('api_usage')
        .update({ scan_count: currentCount + 1 })
        .eq('month', monthKey);
    } else {
      await supabase
        .from('api_usage')
        .insert({ month: monthKey, scan_count: 1 });
    }

    console.log(`📊 Scan ${currentCount + 1}/${MONTHLY_SCAN_LIMIT}`);

    // Convertir image en base64
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_ANTHROPIC_API_KEY not configured');
    }

    // Appel à Claude Vision
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Lis l'étiquette de cette bouteille de vin et extrais:
1. Nom du domaine/producteur (ex: Château, Domaine, etc.) - UNIQUEMENT le nom du producteur
2. Nom complet de la cuvée (ex: "Chablis Premier Cru Montmains", "Pauillac", "Grand-Puy-Lacost")
3. Millésime (année)
4. Appellation/région
5. Pays
6. Tout texte mentionnant "grand cru classé", "cru classé", "classé 1855", "classé 1859", ou "premier/deuxième cru" s'il existe

Si la cuvée est identique au domaine, répète le nom du domaine.

Retourne uniquement les informations trouvées, une par ligne, sans formatage:
DOMAINE: ...
CUVEE: ...
VINTAGE: ...
APPELLATION: ...
REGION: ...
PAYS: ...
CLASSEMENT: [texte exact si présent, sinon laisser vide]`,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Claude Vision API error: ${error.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const rawText = data.content[0].text; // Garder le texte brut complet

    console.log('✅ Réponse Claude Vision:');
    console.log('─'.repeat(60));
    console.log(rawText);
    console.log('─'.repeat(60));

    return NextResponse.json({ text: rawText, rawText });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
