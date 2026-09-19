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
    fullName: 'Olimpíada Brasileira de Foguetes',
  },
  school: {
    name: '4º Colégio da Polícia Militar de Maringá',
    city: 'Maringá',
  },
  crew: [
    {
      name: 'Thiago',
      role: 'Estudante · equipe do Projeto Ícaro',
      photo: 'project/team/pessoa-1.jpg',
      placeholder: false,
    },
    {
      name: 'Yuri',
      role: 'Estudante · equipe do Projeto Ícaro',
      photo: 'project/team/pessoa-2.jpg',
      placeholder: false,
    },
  ],
  originStory: [
    'O Projeto Ícaro nasceu de uma inscrição em um projeto de foguetes. Nada de grandes laboratórios: uma base, dois estudantes e a vontade de entender, na prática, como um foguete se comporta fora do papel.',
    'Cada etapa foi medida, ajuste e aprendizado — o tipo de coisa que não sai do papel, sai da base de lançamento.',
  ],
  timeline: [
    {
      title: 'Início do projeto de foguetes',
      description:
        'A inscrição no projeto de foguetes deu o pontapé: escolher o modelo, montar a base e aprender na prática o que um foguete precisa para sair do chão.',
      dateLabel: '',
    },
    {
      title: 'Etapa de lançamento',
      description:
        'O lançamento foi o momento de colocar à prova o que vinha do papel: ajustar o modelo, preparar a base e acompanhar a descida.',
      dateLabel: '',
    },
    {
      title: 'Classificação para a Jornada OBAFOG',
      description:
        'O resultado saiu e o projeto mudou de tamanho: fomos classificados para a Jornada da OBAFOG.',
      dateLabel: '19/10/2026',
    },
  ],
  qualification: {
    dateLabel: '19/10/2026',
    context:
      'A classificação veio em um lançamento em que o foguete se comportou bem dentro do que estava planejado. Vale lembrar o que isso significa em uma Jornada: projeto aprovado em uma etapa, e uma etapa nova na frente.',
    confirmed: false,
  },
  fundingUse: [
    { label: 'Base de lançamento', note: 'valor a definir' },
    { label: 'Foguete da próxima etapa', note: 'valor a definir' },
  ],
  pix: {
    beneficiary: '',
    key: '44988061945',
    payload: null,
  },
  contact: {
    email: '',
    instagram: '',
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
      {
        src: 'project/launches/base-de-lancamento.jpg',
        alt: 'Base de lançamento do Projeto Ícaro',
        caption: 'A base de lançamento do Projeto Ícaro',
        placeholder: false,
        ratio: 'portrait',
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
      {
        src: 'project/journey/yuri-na-base.jpg',
        alt: 'Yuri com a base de lançamento do Projeto Ícaro',
        caption: 'Yuri com a base de lançamento',
        placeholder: false,
        ratio: 'portrait',
      },
      {
        src: 'project/journey/yuri-com-foguete.jpg',
        alt: 'Yuri com o foguete do Projeto Ícaro',
        caption: 'Yuri com o foguete',
        placeholder: false,
        ratio: 'portrait',
      },
      {
        src: 'project/journey/yuri-com-foguete-b.jpg',
        alt: 'Yuri com o foguete do Projeto Ícaro',
        caption: 'Yuri com o foguete',
        placeholder: false,
        ratio: 'portrait',
      },
    ],
    documents: [],
  },
}