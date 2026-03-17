import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const siret = req.nextUrl.searchParams.get('siret')

  if (!siret || !/^\d{14}$/.test(siret)) {
    return NextResponse.json(
      { error: 'SIRET invalide (14 chiffres requis)' },
      { status: 400 }
    )
  }

  const token = process.env.INSEE_API_TOKEN
  if (!token) {
    return NextResponse.json(
      { error: 'API INSEE non configurée' },
      { status: 503 }
    )
  }

  try {
    const res = await fetch(
      `https://api.insee.fr/entreprises/sirene/V3/siret/${siret}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept:        'application/json',
        },
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'SIRET non trouvé' },
        { status: 404 }
      )
    }

    const data = await res.json()
    const etab = data.etablissement
    const ul = etab.uniteLegale

    return NextResponse.json({
      siret:       etab.siret,
      siren:       etab.siren,
      companyName: ul.denominationUniteLegale
                   ?? `${ul.prenom1UniteLegale ?? ''} ${ul.nomUniteLegale ?? ''}`.trim(),
      address:     etab.adresseEtablissement,
      active:      etab.etatAdministratifEtablissement === 'A',
    })
  } catch (err) {
    console.error('[SIRET ERROR]', err)
    return NextResponse.json(
      { error: 'Erreur API INSEE' },
      { status: 500 }
    )
  }
}
