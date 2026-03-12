export const MAGIC_SECTIONS = {
  'Distruzione': {
    name: 'Distruzione',
    categories: {
      'Fuoco': { name: 'Fuoco', competence: 'fuoco' },
      'Ghiaccio': { name: 'Ghiaccio', competence: 'ghiaccio' },
      'Elettrico': { name: 'Elettrico', competence: 'elettrico' },
      'Esplosivo': { name: 'Esplosivo', competence: 'esplosivo' },
      'Lavico': { name: 'Lavico', competence: 'lavico' },
      'Vento': { name: 'Vento', competence: 'vento' },
      'Oro': { name: 'Oro', competence: 'oro' },
      'Terra': { name: 'Terra', competence: 'terra' },
      'Neo-Arcano': { name: 'Neo-Arcano', competence: 'neo_arcano' }
    }
  },
  'Illusione': {
    name: 'Illusione',
    categories: {
      'Illusione_Base': { name: 'Illusione', competence: 'illusione' },
      'Ombra_Illusione': { name: 'Ombra', competence: 'ombra' },
      'Telecinesi': { name: 'Telecinesi', competence: 'telecinesi' }
    }
  },
  'Evocazione': {
    name: 'Evocazione',
    categories: {
      'Evocazione_energetica': { name: 'Evocazione energetica', competence: 'evocazione_energetica' },
      'Evocazione_Necromantica': { name: 'Evocazione Necromantica', competence: 'evocazione_necromantica' }
    }
  },
  'Supporto': {
    name: 'Supporto',
    categories: {
      'Supporto_Base': { name: 'Supporto', competence: 'supporto' },
      'Sangue_Supporto': { name: 'Sangue', competence: 'sangue' },
      'Divino': { name: 'Divino', competence: 'divino' },
      'Neo-Arcano_Supporto': { name: 'Neo-Arcano', competence: 'neo_arcano_supporto' }
    }
  },
  'Alterazione': {
    name: 'Alterazione',
    categories: {
      'Veleno': { name: 'Veleno', competence: 'veleno' },
      'Sangue': { name: 'Sangue', competence: 'sangue_alterazione' },
      'Terra': { name: 'Terra', competence: 'terra_alterazione' },
      'Acqua': { name: 'Acqua', competence: 'acqua' },
      'Ossa': { name: 'Ossa', competence: 'ossa' },
      'Vento': { name: 'Vento', competence: 'vento_alterazione' },
      'Gravità': { name: 'Gravità', competence: 'gravita' },
      'Spazio': { name: 'Spazio', competence: 'spazio' },
      'Tempo': { name: 'Tempo', competence: 'tempo' },
      'Elementale': { name: 'Elementale', competence: 'elementale' }
    }
  },
  'Alchimia': {
    name: 'Alchimia',
    categories: {
      'Pratica': { name: 'Pratica', competence: 'pratica' },
      'Utilitaria': { name: 'Utilitaria', competence: 'utilitaria' }
    }
  },
  'Divinazione': {
    name: 'Divinazione',
    categories: {
      'Runica': { name: 'Runica', competence: 'runica' },
      'Divinazione_Base': { name: 'Divinazione', competence: 'divinazione' }
    }
  },
  'Trasmutazione': {
    name: 'Trasmutazione',
    categories: {
      'Trasmutazione_Base': { name: 'Trasmutazione', competence: 'trasmutazione' },
      'Alterazione_Trasmutazione': { name: 'Alterazione', competence: 'alterazione_trasmutazione' },
      'Elementale_Trasmutazione': { name: 'Elementale', competence: 'elementale_trasmutazione' }
    }
  },
  'Occulto': {
    name: 'Occulto',
    categories: {
      'Sangue_Occulto': { name: 'Sangue', competence: 'sangue_occulto' },
      'Ombra_Occulto': { name: 'Ombra', competence: 'ombra_occulto' },
      'Ossa_Occulto': { name: 'Ossa', competence: 'ossa_occulto' }
    }
  },
  'Arcano': {
    name: 'Arcano',
    categories: {
      'Caotico': { name: 'Caotico', competence: 'caotico' },
      'Compresso': { name: 'Compresso', competence: 'compresso' }
    }
  },
  'Speciale': {
    name: 'Speciale',
    categories: {
      'Draconico': { name: 'Draconico', competence: 'draconico' },
      'Infernale': { name: 'Infernale', competence: 'infernale' },
      'Critico': { name: 'Critico', competence: 'critico' },
      'Altro': { name: 'Altro', competence: 'altro' }
    }
  }
}

export const MAGIC_GRADES = ['Semplice', 'Avanzata', 'Suprema'] as const

export type MagicGrade = typeof MAGIC_GRADES[number]
export type MagicSectionKey = keyof typeof MAGIC_SECTIONS
