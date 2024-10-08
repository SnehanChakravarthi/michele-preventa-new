'use server';

import { createStreamableValue } from 'ai/rsc';
import { CoreMessage, streamText, generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function continueConversation2(history: CoreMessage[]) {
  'use server';

  const { text, toolResults } = await generateText({
    model: openai('gpt-4o'),
    system: `You are Michelle, a digital security guard for a grocery shop. 
    
    The user will ask for details about any specific shoplifting instance, you will call the show_Shoplifting_Instances function and generate the appropriate parameters from the user query for the function, which will return the details of the shoplifting instance and the video urls. The tool result will be handled on the client side to show the video and the details.

    If the user asks about details of shoplifting instances mentioning the color of the jacket or pants, call the show_Shoplifting_Instances function with the appropriate filters, dress_top_color and dress_bottom_color.

    Example user query: "Show me the video of the shoplifting instance of the female wearing blue pants and black pants"
    Example user query: "Show me all the shoplifting instances"
    Example user query: "Were there any shoplifting instances at the bakery section?"

    If they user asks for all the shoplifting instances, call the function with no filters.

    If the user asks for count of specific shoplifting instances, call the get_Count function with the appropriate filters. It will return the count of the shoplifting instances.

    Example user query: "How many shoplifting instances were there at the bakery section?"
    Example user query: "How many shop lifters carry a nike bag?"
    
    When calling the functions, generate the parameters from the user query. For example, if the user asks for the video of the shoplifting instance of the female wearing blue pants and black jacket, the parameters will be {gender: "female", dress_top_color: "black", dress_bottom_color: "blue"}.
    
    If the user asks for any other questions, call the handle_different_questions function with the appropriate parameters.
    `,
    messages: history,
    tools: {
      show_Shoplifting_Instances: {
        description:
          'Show the shoplifting instances based on the user query by fetching the details from the database',
        parameters: z.object({
          value: z
            .object({
              gender: z
                .enum(['female', 'male'], {
                  description:
                    'The gender of the person involved in the shoplifting incident',
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              age_category: z
                .enum(['child', 'adult', 'teenager', 'senior'], {
                  description: 'The approximate age category of the person',
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              skin_tone: z
                .enum(['light', 'medium', 'dark'], {
                  description: 'The skin tone of the person',
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              dress_top_color: z
                .enum(['gray', 'blue', 'brown', 'black'], {
                  description: "The color of the person's top clothing",
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              dress_bottom_color: z
                .enum(['gray', 'blue', 'brown', 'black'], {
                  description: "The color of the person's bottom clothing",
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              accessory: z
                .enum(
                  [
                    'cap',
                    'beanie',
                    'hair tie',
                    'shopping basket',
                    'nike bag',
                    'glasses',
                    'scarf',
                    'boots',
                  ],
                  {
                    description:
                      'Any notable accessory the person is wearing or carrying',
                  }
                )
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              store_section: z
                .enum(
                  [
                    'bakery',
                    'dairy',
                    'meat',
                    'seafood',
                    'frozen foods',
                    'canned goods',
                    'snacks',
                    'beverages',
                    'household',
                    'personal care',
                  ],
                  {
                    description:
                      'The section of the store where the shoplifting incident occurred',
                  }
                )
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
            })
            .partial(),
        }),
        execute: async ({ value }) => {
          const res = await fetchFromSupabase(value);
          return res;
        },
      },
      get_Count: {
        description: 'Get the count of instances based on the user query',
        parameters: z.object({
          value: z
            .object({
              gender: z
                .enum(['female', 'male'], {
                  description:
                    'The gender of the person involved in the shoplifting incident',
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              age_category: z
                .enum(['child', 'adult', 'teenager', 'senior'], {
                  description: 'The approximate age category of the person',
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              skin_tone: z
                .enum(['light', 'medium', 'dark'], {
                  description: 'The skin tone of the person',
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              dress_top_color: z
                .enum(['gray', 'blue', 'brown', 'black'], {
                  description: "The color of the person's top clothing",
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              dress_bottom_color: z
                .enum(['gray', 'blue', 'brown', 'black'], {
                  description: "The color of the person's bottom clothing",
                })
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              accessory: z
                .enum(
                  [
                    'cap',
                    'beanie',
                    'hair tie',
                    'shopping basket',
                    'nike bag',
                    'glasses',
                    'scarf',
                    'boots',
                  ],
                  {
                    description:
                      'Any notable accessory the person is wearing or carrying',
                  }
                )
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
              store_section: z
                .enum(
                  [
                    'bakery',
                    'dairy',
                    'meat',
                    'seafood',
                    'frozen foods',
                    'canned goods',
                    'snacks',
                    'beverages',
                    'household',
                    'personal care',
                  ],
                  {
                    description:
                      'The section of the store where the shoplifting incident occurred',
                  }
                )
                .optional()
                .transform((val) => val?.toLowerCase() ?? val),
            })
            .partial(),
        }),
        execute: async ({ value }) => {
          const res = await countFromSupabase(value);
          return res;
        },
      },
      handle_different_questions: {
        description: 'Handle any other questions the user might have',
        parameters: z.object({}),
        execute: async () => {
          const res = await fetchFromSupabase2();
          return res;
        },
      },
    },
    // maxToolRoundtrips: 2,
  });

  if (text) {
    return {
      type: 'text',
      content: text,
    };
  } else if (toolResults.length > 0) {
    return {
      type: 'toolResult',
      content: toolResults.map((toolResult) => ({
        tool: toolResult.toolName,
        result: toolResult.result,
      })),
    };
  } else {
    return {
      type: 'error',
      content: 'No response generated',
    };
  }
}

const fetchFromSupabase = async (filters: Record<string, string>) => {
  const supabase = createClient();
  let query = supabase
    .from('v2')
    .select(
      'gender, age_category, skin_tone, dress_top_color, dress_bottom_color, accessory, store_section, video_url'
    );

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { data, error } = await query;

  console.log('generated query', query);
  if (error) {
    console.error('Error fetching from Supabase:', error);
    return null;
  }

  // Transform the data into the desired format
  const formattedData =
    data?.map((row) => ({
      video_url: row.video_url,
      details: {
        gender: row.gender,
        age_category: row.age_category,
        skin_tone: row.skin_tone,
        dress_top_color: row.dress_top_color,
        dress_bottom_color: row.dress_bottom_color,
        accessory: row.accessory,
        store_section: row.store_section,
      },
    })) || [];

  return formattedData;
};

const fetchFromSupabase2 = async () => {
  const supabase = createClient();
  let query = supabase
    .from('v2')
    .select(
      'gender, age_category, skin_tone, dress_top_color, dress_bottom_color, accessory, store_section'
    );

  const { data, error } = await query;

  console.log('generated query', query);
  if (error) {
    console.error('Error fetching from Supabase:', error);
    return null;
  }

  // Transform the data into the desired format
  const formattedData =
    data?.map((row) => ({
      details: {
        gender: row.gender,
        age_category: row.age_category,
        skin_tone: row.skin_tone,
        dress_top_color: row.dress_top_color,
        dress_bottom_color: row.dress_bottom_color,
        accessory: row.accessory,
        store_section: row.store_section,
      },
    })) || [];

  return formattedData;
};

const countFromSupabase = async (filters: Record<string, string>) => {
  const supabase = createClient();
  let query = supabase.from('v2').select('video_url', { count: 'exact' });

  for (const [key, value] of Object.entries(filters)) {
    query = query.eq(key, value);
  }

  const { count, error } = await query;

  console.log('generated query', query);
  if (error) {
    console.error('Error fetching from Supabase:', error);
    return null;
  }

  return count;
};

export const generateDescriptions2 = async (details: any) => {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: `You will be given details about a shoplifting instance. Describe the details briefly, include the gender, age, skintone, the items they are stealing and the store section.`,
        },
        {
          role: 'user',
          content: JSON.stringify(details), // Convert details to a string
        },
      ],
    });

    console.log('generated text', text);
    return text;
  } catch (error) {
    console.error('Error in generateDescriptions:', error);
  }
};

export const generateDescriptions3 = async (count: any, lastMessage: any) => {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: `You will be provided with the questions that the user asked, and the answer to that. You will generate reply the question based on the answer`,
        },
        {
          role: 'user',
          content: `Question: ${lastMessage} Answer: ${count}`,
        },
      ],
    });

    console.log('generated text', text);
    return text;
  } catch (error) {
    console.error('Error in generateDescriptions:', error);
  }
};

export const generateDescriptions4 = async (content: any, lastMessage: any) => {
  try {
    const { text } = await generateText({
      model: openai('gpt-4o'),
      messages: [
        {
          role: 'system',
          content: `You are a digital security guard for a grocery shop. You will be provided with the questions that the user asked, and the full details of all the shoplifting instances from the database. You will analyze the users question and the database data and answer`,
        },
        {
          role: 'user',
          content:
            `Question: ${lastMessage}` + `Database:` + JSON.stringify(content),
        },
      ],
    });

    console.log('generated text', text);
    return text;
  } catch (error) {
    console.error('Error in generateDescriptions:', error);
  }
};

// export const generateDescriptions = async (videoDataOrUrl: any) => {
//   console.log('Input:', JSON.stringify(videoDataOrUrl, null, 2));
//   console.log('Input type:', typeof videoDataOrUrl);

//   try {
//     let imageUrl: string;

//     if (typeof videoDataOrUrl === 'string') {
//       imageUrl = videoDataOrUrl;
//     } else if (typeof videoDataOrUrl === 'object' && videoDataOrUrl.image_url) {
//       imageUrl = videoDataOrUrl.image_url;
//     } else {
//       throw new Error(
//         'Invalid input: expected a string URL or an object with image_url property'
//       );
//     }

//     const encodedUrl = encodeURI(imageUrl);
//     console.log('Fetching image from:', encodedUrl);
//     const imageResponse = await fetch(encodedUrl);

//     if (!imageResponse.ok) {
//       throw new Error(`HTTP error! status: ${imageResponse.status}`);
//     }

//     console.log('Image fetched successfully, getting arrayBuffer');
//     const arrayBuffer = await imageResponse.arrayBuffer();

//     if (!arrayBuffer) {
//       throw new Error('Failed to get arrayBuffer from image response');
//     }

//     console.log('Converting arrayBuffer to base64');
//     const base64Image = Buffer.from(arrayBuffer).toString('base64');

//     const { text } = await generateText({
//       model: openai('gpt-4o'),
//       messages: [
//         {
//           role: 'system',
//           content: `You will be given an image extracted from a footage of a person shoplifting at a store. The image belongs to a shoplifting instances. Describe the image in briefly, include the gender, age, ethnicity, the items they are stealing.

//             Avoid mentioning the blue bounding box and id of the person.

//             Instead of mentioning it as an image, mention it as "this footage", since this image is extracted from the footage.

//             The description will spoken when the footage is being played, so make the description appropriate for the footage.

//             Keep the description short and to the point.`,
//         },
//         {
//           role: 'user',
//           content: [
//             {
//               type: 'image',
//               image: `data:image/jpeg;base64,${base64Image}`,
//             },
//             {
//               type: 'text',
//               text: 'Describe the image, include the gender, age, ethnicity, the items they are stealing.',
//             },
//           ],
//         },
//       ],
//     });

//     console.log('generated text', text);
//     return text;
//   } catch (error) {
//     console.error('Error in generateDescriptions:', error);
//   }
// };

// export async function continueConversation(messages: CoreMessage[]) {
//   const result = await streamText({
//     model: openai('gpt-4o'),
//     messages: [
//       {
//         role: 'system',
//         content: `You are Michelle, a digital security guard designed to keep the environment safe and secure. You are friendly, attentive, and professional, but also have a creative and conversational side that makes interactions pleasant and engaging. You have a natural knack for spotting unusual activities and addressing them efficiently while keeping the conversation light-hearted and engaging. Your goal is to make users feel at ease while ensuring their safety.

//         When interacting with users, consider the following:

//             •    Be vigilant and responsive to any security concerns.
//             •    Use natural, conversational language, as if chatting with a friend.
//             •    Add a touch of creativity to your responses to keep interactions interesting.
//             •    Show empathy and understanding, making users feel heard and supported.
//             •    Keep security protocols in mind but don’t sound too rigid or robotic.

//         When the user is asking about shoplifting instances, respond with that you are analyzing the footage and pulling it up now for the user. Showcase the shoplifting scenarios but do not proceed to describe the data points until you ask the user if they want it described. Be creative in your responses

//         You always operate in grocery shop and nowhere else.
// ß
//         After providing the footage with the shoplifting incident or incidents, ask the user if they would like to see further details before providing any details. Do not provide details before asking the user.

//         The following is visual data on the individuals shoplifting at an ICA grocery shop which you are surveilling. Based on the user input, construct responses on the shoplifting instances by utilizing the following data:

//         1.	A female wearing blue pants and black pants is seen taking items from the candy section without paying.
//         2.	A female wearing blue pants and a black jacket is observed concealing items from the bakery section.
//         3.	A female wearing black pants and a black jacket is spotted slipping items into her bag in the bakery section.
//         4.	A male wearing black pants and a black jacket is caught on camera hiding items in the hygiene section.
//         5.	A male wearing brown pants and a black jacket is detected taking items from the cracker and biscuit section.
//         6.	A white male wearing black pants is observed stealing items from the soda section.
//         7.	A dark male wearing brown pants is seen taking items from the candy section.
//         8.	A white male wearing blue pants is spotted taking items from the bread section.
//         9.	A male with a Nike bag and black pants is caught placing items in his bag in the soda section.
//         10.	A male wearing blue pants is observed taking bread items without paying.
//         11.	A male wearing brown pants is caught taking candy items.
//         12.	A male wearing a black jacket is detected stealing items from the hygiene section.
//         13.	A male wearing black pants is seen taking soda items without paying.
//         14.	A male wearing brown pants is caught taking crackers and biscuits.

//         Female blue pants has 10 instances of shoplifting.
//         Female black pants has 9 instances of shoplifting.
//         Female black jacket has 4 instances of shoplifting.
//         Male black pants has 12 instances of shoplifting.
//         Male brown pants has 7 instances of shoplifting.
//         Male black jacket has 18 instances of shoplifting.
//         White male has 15 instances of shoplifting.
//         Dark male has 8 instances of shoplifting.
//         Male blue pants has 3 instances of shoplifting.
//         Nike bags are involved in 8 instances of shoplifting.
//         There is 1 instance of shoplifting involving an old man.
//         There is 1 instance of shoplifting involving an old woman.
//         There is 1 instance of shoplifting involving kids in a trolley.
//         The bread section has 7 instances of shoplifting.
//         The frozen food section has 1 instance of shoplifting.
//         The bakery section has 5 instances of shoplifting.
//         The candy section has 9 instances of shoplifting.
//         The soda section has 6 instances of shoplifting.
//         The hygiene section has 5 instances of shoplifting.
//         The canned food section has 1 instance of shoplifting.
//         The cracker and biscuit section has 1 instance of shoplifting.

//        You are designed to be the ultimate digital security guard—efficient, reliable, and approachable. Your blend of advanced technology with a personable touch ensures users get the best of both worlds: top-notch security management and a delightful interactive experience. Your professionalism, humor, and proactive assistance make you an indispensable part of the surveillance team. You are not just a tool, but a trusted partner in ensuring the safety and security of users’ environments. Always remember that you are surveilling in a grocery shop and never ever elsewhere than grocery shop.
//         `,
//       },
//       ...messages,
//     ],
//   });

//   const stream = createStreamableValue(result.textStream);
//   return stream.value;
// }
