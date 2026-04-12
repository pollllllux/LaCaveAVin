import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { domaine, cuvee, appellation, country } = await request.json();

    if (!domaine) {
      return NextResponse.json({ error: 'No domaine provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_ANTHROPIC_API_KEY not configured');
    }

    console.log(`🔍 Vérification du domaine: ${domaine} | Cuvée: ${cuvee}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: `Vérifie et corrige les informations de vin suivantes détectées sur une étiquette:
- Domaine/Producteur détecté: ${domaine}
- Cuvée détectée: ${cuvee}
- Appellation/région: ${appellation}
- Pays: ${country}

Pour chacun (domaine et cuvée):
1. Vérifie si le domaine ET la cuvée existent vraiment
2. Retourne le nom EXACT et officiel s'ils existent
3. Retourne "INEXISTANT" si l'un d'eux n'existe pas
4. Corrige les petites erreurs de frappe

Retourne exactement dans ce format (2 lignes):
DOMAINE: [nom exact ou INEXISTANT]
CUVEE: [nom exact ou INEXISTANT]

Pas d'explications, juste les deux lignes.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ Vérification échouée');
      return NextResponse.json(
        { correctedDomaine: domaine, correctedCuvee: cuvee },
        { status: 200 }
      );
    }

    const data = await response.json();
    const responseText = data.content[0].text.trim();

    // Parser les deux lignes
    const lines = responseText.split('\n');
    let correctedDomaine = domaine;
    let correctedCuvee = cuvee;

    for (const line of lines) {
      if (line.startsWith('DOMAINE:')) {
        correctedDomaine = line.replace('DOMAINE:', '').trim();
      } else if (line.startsWith('CUVEE:')) {
        correctedCuvee = line.replace('CUVEE:', '').trim();
      }
    }

    if (correctedDomaine === 'INEXISTANT' || correctedCuvee === 'INEXISTANT') {
      console.log(`⚠️ Vin inexistant: ${domaine} / ${cuvee}`);
      return NextResponse.json({ correctedDomaine: domaine, correctedCuvee: cuvee });
    }

    console.log(`✅ Domaine corrigé: ${correctedDomaine} | Cuvée corrigée: ${correctedCuvee}`);
    return NextResponse.json({ correctedDomaine, correctedCuvee });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
