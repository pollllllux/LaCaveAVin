import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { domaine, appellation, country } = await request.json();

    if (!domaine) {
      return NextResponse.json({ error: 'No domaine provided' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('NEXT_PUBLIC_ANTHROPIC_API_KEY not configured');
    }

    console.log(`🔍 Vérification du nom: ${domaine}`);

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
            content: `Le producteur/domaine suivant a été détecté sur une étiquette de vin:
- Nom détecté: ${domaine}
- Appellation/région: ${appellation}
- Pays: ${country}

Vérifie si ce vin/producteur existe vraiment. Si oui, retourne UNIQUEMENT le nom exact et officiel du producteur tel qu'il est référencé (ex: "Château XYZ" ou "Domaine XYZ").
Si non, retourne "INEXISTANT".

Ne retourne QUE le nom, pas d'explications.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.warn('⚠️ Vérification échouée');
      return NextResponse.json(
        { correctedName: domaine },
        { status: 200 }
      );
    }

    const data = await response.json();
    const correctedName = data.content[0].text.trim();

    if (correctedName === 'INEXISTANT') {
      console.log(`⚠️ Vin inexistant: ${domaine}`);
      return NextResponse.json({ correctedName: domaine });
    }

    console.log(`✅ Nom corrigé: ${correctedName}`);
    return NextResponse.json({ correctedName });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
