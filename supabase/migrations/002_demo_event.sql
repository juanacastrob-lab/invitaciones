-- =============================================================================
-- 002_demo_event.sql — Evento demo para los anuncios
--
-- GENERADO AUTOMÁTICAMENTE. No editar a mano:
--   se escribe desde src/demo/demo-event.ts con `npm run build:demo-seed`.
--
-- Pareja, lugares y fotos son ficticios, así que se puede enseñar y compartir
-- sin permiso de ningún cliente. Correrlo dos veces no duplica nada.
-- =============================================================================

insert into events (
  slug, type, template, languages, default_language, timezone, status,
  content, rsvp_deadline, allow_public_rsvp, show_private_gifts
)
values (
  'ana-y-luis',
  'boda',
  'aurora',
  '{es,en}',
  'es',
  'America/Mexico_City',
  'publicado',
  $demo${
  "version": 1,
  "couple": {
    "partnerA": "Ana Sofía",
    "partnerB": "Luis Alberto"
  },
  "startsAt": "2027-03-13T17:00",
  "og": {
    "title": {
      "es": "Ana Sofía & Luis Alberto · 13 de marzo de 2027",
      "en": "Ana Sofía & Luis Alberto · March 13, 2027"
    },
    "description": {
      "es": "Nos casamos en Tepoztlán y queremos que estés ahí. Confirma tu asistencia.",
      "en": "We are getting married in Tepoztlán and we want you there. Please RSVP."
    }
  },
  "sectionOrder": [
    "cover",
    "countdown",
    "story",
    "itinerary",
    "dressCode",
    "noKids",
    "gifts",
    "lodging",
    "gallery",
    "faq",
    "rsvp"
  ],
  "cover": {
    "headline": {
      "es": "Nos casamos",
      "en": "We are getting married"
    },
    "tagline": {
      "es": "Sábado 13 de marzo de 2027 · Tepoztlán, Morelos",
      "en": "Saturday, March 13, 2027 · Tepoztlán, Morelos"
    },
    "photo": {
      "url": "/demo/portada.webp",
      "alt": {
        "es": "Ana Sofía y Luis Alberto tomados de la mano al atardecer",
        "en": "Ana Sofía and Luis Alberto holding hands at sunset"
      }
    }
  },
  "countdown": {
    "label": {
      "es": "Falta poco",
      "en": "Not long now"
    }
  },
  "story": {
    "title": {
      "es": "Nuestra historia",
      "en": "Our story"
    },
    "body": {
      "es": "Nos conocimos una tarde de lluvia en una cafetería de la Roma, donde los dos estábamos esperando a que parara el aguacero. Doce años después seguimos esperando juntos: los camiones, las filas del súper, los resultados de los exámenes, el año nuevo. Ahora los esperamos a ustedes.",
      "en": "We met on a rainy afternoon in a café in Mexico City, both waiting for the storm to pass. Twelve years later we are still waiting together: for buses, for grocery lines, for test results, for the new year. Now we are waiting for you."
    },
    "photo": {
      "url": "/demo/historia.webp",
      "alt": {
        "es": "La pareja riendo",
        "en": "The couple laughing"
      }
    }
  },
  "itinerary": {
    "title": {
      "es": "El día",
      "en": "The day"
    },
    "acts": [
      {
        "id": "civil",
        "kind": "civil",
        "title": {
          "es": "Ceremonia civil",
          "en": "Civil ceremony"
        },
        "startsAt": "2027-03-13T17:00",
        "venue": {
          "name": "Jardín de la Hacienda Santa Elena",
          "address": "Camino a Santo Domingo 45, Tepoztlán, Morelos",
          "lat": 18.9847,
          "lng": -99.093
        },
        "note": {
          "es": "Llega quince minutos antes: la ceremonia empieza puntual.",
          "en": "Please arrive fifteen minutes early: the ceremony starts on time."
        }
      },
      {
        "id": "religiosa",
        "kind": "religiosa",
        "title": {
          "es": "Ceremonia religiosa",
          "en": "Religious ceremony"
        },
        "startsAt": "2027-03-13T18:30",
        "venue": {
          "name": "Parroquia de la Natividad",
          "address": "Av. Revolución 1910 s/n, Centro, Tepoztlán, Morelos",
          "lat": 18.9853,
          "lng": -99.0997
        }
      },
      {
        "id": "recepcion",
        "kind": "recepcion",
        "title": {
          "es": "Recepción",
          "en": "Reception"
        },
        "startsAt": "2027-03-13T20:30",
        "venue": {
          "name": "Hacienda Santa Elena",
          "address": "Camino a Santo Domingo 45, Tepoztlán, Morelos",
          "lat": 18.9847,
          "lng": -99.093
        },
        "note": {
          "es": "Cena, baile y lo que aguante la noche.",
          "en": "Dinner, dancing, and whatever the night allows."
        }
      }
    ]
  },
  "dressCode": {
    "title": {
      "es": "Código de vestimenta",
      "en": "Dress code"
    },
    "code": {
      "es": "Etiqueta rigurosa",
      "en": "Black tie"
    },
    "notes": {
      "es": "La recepción es al aire libre y en marzo refresca de noche. Trae algo para el frío y considera que el piso es de piedra.",
      "en": "The reception is outdoors and March nights get cool. Bring a layer, and keep in mind the floor is stone."
    },
    "palette": [
      "#7d8471",
      "#c9b8a8",
      "#4a4a48"
    ]
  },
  "noKids": {
    "note": {
      "es": "Adoramos a sus hijos, pero queremos que esta noche sea de ustedes. La celebración es solo para adultos.",
      "en": "We adore your children, but we want this night to be yours. The celebration is adults only."
    }
  },
  "gifts": {
    "title": {
      "es": "Mesa de regalos",
      "en": "Gift registry"
    },
    "note": {
      "es": "Su presencia es lo que de verdad queremos. Si además quieren regalarnos algo, aquí hay opciones.",
      "en": "Your presence is what we really want. If you would also like to give something, here are some options."
    },
    "links": [
      {
        "label": {
          "es": "Liverpool · evento 51234567",
          "en": "Liverpool · event 51234567"
        },
        "url": "https://mesaderegalos.liverpool.com.mx/"
      },
      {
        "label": {
          "es": "Amazon México",
          "en": "Amazon Mexico"
        },
        "url": "https://www.amazon.com.mx/wedding/"
      }
    ],
    "bank": {
      "bank": "BBVA México",
      "holder": "Ana Sofía Vargas Trejo",
      "clabe": "012345678901234567",
      "note": {
        "es": "Si prefieren hacer una transferencia, esta es la cuenta.",
        "en": "If you prefer a bank transfer, this is the account."
      }
    },
    "envelopes": true
  },
  "lodging": {
    "title": {
      "es": "Dónde quedarse",
      "en": "Where to stay"
    },
    "options": [
      {
        "name": "Posada del Tepozteco",
        "note": {
          "es": "A diez minutos del salón. Tarifa especial mencionando la boda.",
          "en": "Ten minutes from the venue. Special rate if you mention the wedding."
        },
        "url": "https://www.posadadeltepozteco.com/",
        "phone": "+527393950010"
      },
      {
        "name": "Hotel Amomoxtli",
        "note": {
          "es": "Junto al río, para quien quiera quedarse el fin de semana completo.",
          "en": "By the river, for anyone staying the whole weekend."
        },
        "url": "https://amomoxtli.com/",
        "phone": "+527393951520"
      }
    ]
  },
  "gallery": {
    "title": {
      "es": "Nosotros",
      "en": "Us"
    },
    "photos": [
      {
        "url": "/demo/galeria-1.webp",
        "alt": {
          "es": "En la playa",
          "en": "At the beach"
        }
      },
      {
        "url": "/demo/galeria-2.webp",
        "alt": {
          "es": "La propuesta",
          "en": "The proposal"
        }
      },
      {
        "url": "/demo/galeria-3.webp",
        "alt": {
          "es": "Con la familia",
          "en": "With family"
        }
      },
      {
        "url": "/demo/galeria-4.webp",
        "alt": {
          "es": "De viaje",
          "en": "Travelling"
        }
      }
    ]
  },
  "faq": {
    "title": {
      "es": "Preguntas",
      "en": "Questions"
    },
    "items": [
      {
        "q": {
          "es": "¿Hay estacionamiento?",
          "en": "Is there parking?"
        },
        "a": {
          "es": "Sí, la hacienda tiene estacionamiento gratuito con valet para todos los invitados.",
          "en": "Yes, the venue has free parking with valet service for all guests."
        }
      },
      {
        "q": {
          "es": "¿Puedo llevar acompañante?",
          "en": "Can I bring a plus one?"
        },
        "a": {
          "es": "Tu invitación indica cuántos pases tienes. Si dice cuatro, son cuatro lugares apartados a tu nombre.",
          "en": "Your invitation shows how many passes you have. If it says four, four seats are reserved in your name."
        }
      },
      {
        "q": {
          "es": "¿Hasta cuándo puedo confirmar?",
          "en": "When is the RSVP deadline?"
        },
        "a": {
          "es": "Hasta el 13 de febrero de 2027. Después de esa fecha ya no podemos hacer cambios con el banquete.",
          "en": "February 13, 2027. After that date we cannot make changes with the caterer."
        }
      },
      {
        "q": {
          "es": "¿Cómo llego desde la Ciudad de México?",
          "en": "How do I get there from Mexico City?"
        },
        "a": {
          "es": "Por la autopista México–Cuernavaca son alrededor de hora y media. Sal con tiempo: los sábados hay tráfico saliendo de la ciudad.",
          "en": "About an hour and a half via the Mexico–Cuernavaca highway. Leave early: Saturdays are busy heading out of the city."
        }
      }
    ]
  },
  "rsvp": {
    "title": {
      "es": "Confirma tu asistencia",
      "en": "RSVP"
    },
    "note": {
      "es": "Por favor confirma antes del 13 de febrero de 2027.",
      "en": "Please respond before February 13, 2027."
    },
    "askMenu": true,
    "menuOptions": [
      {
        "id": "carne",
        "label": {
          "es": "Corte de res",
          "en": "Beef"
        }
      },
      {
        "id": "pollo",
        "label": {
          "es": "Pollo en salsa de morita",
          "en": "Chicken in morita sauce"
        }
      },
      {
        "id": "vegetariano",
        "label": {
          "es": "Vegetariano",
          "en": "Vegetarian"
        }
      }
    ],
    "askDietary": true,
    "askSong": true,
    "askMessage": true
  }
}$demo$::jsonb,
  '2027-02-13 23:59:59-06',
  false,
  true
)
on conflict (slug) do update
  set content   = excluded.content,
      languages = excluded.languages,
      status    = excluded.status;

-- Invitados de prueba, con pases variados para enseñar los distintos casos.
-- El token de cada uno lo genera la base: aleatorio y no adivinable.
insert into guests (event_id, display_name, passes, language, group_tag)
select e.id, v.display_name, v.passes, v.language, v.group_tag
from events e
cross join (
  values
    ('Invitado de muestra', 2, 'es', 'Demo'),
    ('Familia López Ramírez', 4, 'es', 'Familia'),
    ('Mariana Ruiz', 2, 'es', 'Amigos'),
    ('Roberto y Carmen Díaz', 2, 'es', 'Familia'),
    ('Jorge Hernández', 1, 'es', 'Trabajo'),
    ('Familia Contreras', 5, 'es', 'Familia'),
    ('The Miller Family', 3, 'en', 'Friends'),
    ('Sarah Whitfield', 2, 'en', 'Friends'),
    ('Daniel Okonkwo', 1, 'en', 'Work')
) as v(display_name, passes, language, group_tag)
where e.slug = 'ana-y-luis'
  and not exists (
    select 1 from guests g where g.event_id = e.id and g.display_name = v.display_name
  );

-- Los links personales de cada invitado. Guarda el de "Invitado de muestra":
-- ese es el que puedes poner en los anuncios.
select
  g.display_name as invitado,
  g.passes       as pases,
  g.language     as idioma,
  '/i/' || e.slug || '/' || g.token as link
from guests g
join events e on e.id = g.event_id
where e.slug = 'ana-y-luis'
order by g.passes desc, g.display_name;
