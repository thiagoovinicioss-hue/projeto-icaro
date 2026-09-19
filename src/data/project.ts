export const TODO_REAL_CONTENT = 'TODO_REAL_CONTENT'

export type CrewMember = {
  name: string
  role: string
  photo?: string
  placeholder?: boolean
}

export type TimelineEvent = {
  title: string
  description: string
  dateLabel?: string
  photo?: string
}

export type FundingPart = {
  label: string
  note: string
}

export type Photo = {
  src: string
  alt: string
  caption?: string
  placeholder?: boolean
  ratio?: 'wide' | 'portrait' | 'square'
}

export type Project = {
  projectName: string
  tagline: string
  competition: {
    shortName: string
    fullName: string
  }
  school: {
    name: string
    city: string
  }
  crew: CrewMember[]
  originStory: string[]
  timeline: TimelineEvent[]
  qualification: {
    dateLabel: string
    context: string
    confirmed: boolean
  }
  fundingUse: FundingPart[]
  pix: {
    beneficiary: string
    key: string
    payload: string | null
  }
  contact: {
    email: string
    instagram: string
  }
  photos: {
    team: Photo[]
    launches: Photo[]
    journey: Photo[]
    documents: Photo[]
  }
}

export const project: Project = {
  projectName: 'Projeto Ícaro',
  tagline: 'Do chão ao espaço, em conta-gotas.',
  competition: {
    shortName: 'OBAFOG',
    fullName: TODO_REAL_CONTENT,
  },
  school: {
    name: TODO_REAL_CONTENT,
    city: TODO_REAL_CONTENT,
  },
  crew: [
    {
      name: TODO_REAL_CONTENT,
      role: 'Estudante · equipe do Projeto Ícaro',
      photo: 'project/team/pessoa-1.jpg',
      placeholder: false,
    },
    {
      name: TODO_REAL_CONTENT,
      role: 'Estudante · equipe do Projeto Ícaro',
      photo: 'project/team/pessoa-2.jpg',
      placeholder: false,
    },
  ],
  originStory: [
    'O Projeto Ícaro nasceu de uma inscrição em um projeto de foguetes. Nada de grandes laboratórios: uma base, dois estudantes e a vontade de entender, na prática, como um foguete se comporta fora do papel.',
    TODO_REAL_CONTENT,
  ],
  timeline: [
    {
      title: 'Início do projeto de foguetes',
      description: TODO_REAL_CONTENT,
      dateLabel: TODO_REAL_CONTENT,
    },
    {
      title: 'Etapa de lançamento',
      description: TODO_REAL_CONTENT,
      dateLabel: TODO_REAL_CONTENT,
    },
    {
      title: 'Classificação para a Jornada OBAFOG',
      description:
        'O resultado saiu e o projeto mudou de tamanho: fomos classificados para a Jornada da OBAFOG.',
      dateLabel: TODO_REAL_CONTENT,
    },
  ],
  qualification: {
    dateLabel: TODO_REAL_CONTENT,
    context:
      'A classificação veio em um lançamento em que o foguete se comportou bem dentro do que estava planejado. Vale lembrar o que isso significa em uma Jornada: projeto aprovado em uma etapa, e uma etapa nova na frente.',
    confirmed: false,
  },
  fundingUse: [
    { label: 'Base de lançamento', note: 'valor a definir' },
    { label: 'Foguete da próxima etapa', note: 'valor a definir' },
  ],
  pix: {
    beneficiary: TODO_REAL_CONTENT,
    key: TODO_REAL_CONTENT,
    payload: null,
  },
  contact: {
    email: TODO_REAL_CONTENT,
    instagram: TODO_REAL_CONTENT,
  },
  photos: {
    team: [
      {
        src: 'project/team/pessoa-1.jpg',
        alt: 'Estudante integrante do Projeto Ícaro',
        caption: 'Equipe do Projeto Ícaro',
        placeholder: false,
        ratio: 'portrait',
      },
    ],
    launches: [
      {
        src: 'project/launches/foguete-grama.jpg',
        alt: 'Foguete de garrafa PET do Projeto Ícaro apoiado na base na grama',
        caption: 'O Ícaro, modelo de garrafa PET com cone preto e aletas claras',
        placeholder: false,
        ratio: 'portrait',
      },
      {
        src: 'project/launches/lancamento-panorama.jpg',
        alt: 'Vista do espaço de lançamento do projeto',
        caption: 'Nosso espaço de lançamento',
        placeholder: false,
        ratio: 'wide',
      },
    ],
    journey: [
      {
        src: 'project/journey/jornada-paisagem.jpg',
        alt: 'Registro da jornada do projeto',
        caption: 'Registros da jornada',
        placeholder: false,
        ratio: 'wide',
      },
      {
        src: 'project/journey/jornada-retrato.jpg',
        alt: 'Registro da jornada do projeto',
        placeholder: false,
        ratio: 'portrait',
      },
      {
        src: 'project/journey/jornada-prep-a.jpg',
        alt: 'Preparação do lançamento',
        placeholder: false,
        ratio: 'portrait',
      },
      {
        src: 'project/journey/jornada-prep-b.jpg',
        alt: 'Preparação do lançamento',
        placeholder: false,
        ratio: 'portrait',
      },
    ],
    documents: [],
  },
}