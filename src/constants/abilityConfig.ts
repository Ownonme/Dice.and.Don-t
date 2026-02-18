export const ABILITY_SECTIONS = {
  'Da mischia offensive': {
    name: 'Abilità da Mischia Offensive',
    categories: {
      'Spada': { name: 'Spada', competence: 'spada' },
      'Coltello': { name: 'Coltello', competence: 'coltello' },
      'Ascia': { name: 'Ascia', competence: 'ascia' },
      'Mazza': { name: 'Mazza', competence: 'mazza' },
      'Frusta': { name: 'Frusta', competence: 'frusta' },
      'Falce': { name: 'Falce', competence: 'falce' },
      'Tirapugni': { name: 'Tirapugni', competence: 'tirapugni' },
      'Bastone': { name: 'Bastone', competence: 'bastone' },
      'Armi inastate': { name: 'Armi inastate', competence: 'armi_inastate' },
      'Scudo': { name: 'Scudo', competence: 'scudo' }
    }
  },
  'Da mischia difensive': {
    name: 'Abilità da Mischia Difensive',
    categories: {
      'Schivata': { name: 'Schivata', competence: 'schivata' },
      'Parata': { name: 'Parata', competence: 'parata' },
      'Deviazione': { name: 'Deviazione', competence: 'deviazione' },
      'Contrattacco': { name: 'Contrattacco', competence: 'contrattacco' }
    }
  },
  'Armi a distanza': {
    name: 'Armi a Distanza',
    categories: {
      'Precisione': { name: 'Precisione', competence: 'precisione' },
      'Arco': { name: 'Arco', competence: 'arco' },
      'Balestra': { name: 'Balestra', competence: 'balestra' },
      'Fionda': { name: 'Fionda', competence: 'fionda' },
      'Da fuoco': { name: 'Da fuoco', competence: 'da_fuoco' },
      'Da lancio': { name: 'Da lancio', competence: 'da_lancio' },
      'Pesante': { name: 'Pesante', competence: 'pesante' }
    }
  },
  'Logica': {
    name: 'Logica',
    categories: {
      'Logica': { name: 'Logica', competence: 'logica' },
      'Trappole': { name: 'Trappole', competence: 'trappole' },
      'Telecinesi': { name: 'Telecinesi', competence: 'telecinesi' },
      'Alchimia': { name: 'Alchimia', competence: 'alchimia' },
      'Fabbro': { name: 'Fabbro', competence: 'fabbro' },
      'Survivalista': { name: 'Survivalista', competence: 'survivalista' }
    }
  },
  'Furtive': {
    name: 'Furtive',
    categories: {
      'Furtività': { name: 'Furtività', competence: 'furtivita' },
      'Assassinio': { name: 'Assassinio', competence: 'assassinio' },
      'Furto': { name: 'Furto', competence: 'furto' },
      'Saccheggio': { name: 'Saccheggio', competence: 'saccheggio' }
    }
  },
  'Tecnico': {
    name: 'Tecnico',
    categories: {
      'Posture': { name: 'Posture', competence: 'posture' },
      'Generale': { name: 'Generale', competence: 'generale' }
    }
  }
}

export const ABILITY_GRADES = ['Semplice', 'Avanzata', 'Suprema'] as const

export type AbilityGrade = typeof ABILITY_GRADES[number]
export type AbilitySectionKey = keyof typeof ABILITY_SECTIONS