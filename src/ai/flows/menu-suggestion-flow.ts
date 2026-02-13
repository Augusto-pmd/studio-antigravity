'use server';
/**
 * @fileOverview A simple flow that suggests a menu item.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const MenuItemSuggestionInputSchema = z.object({
  topic: z.string().describe('The topic for the menu item suggestion (e.g., "dessert", "seafood").'),
});
export type MenuItemSuggestionInput = z.infer<typeof MenuItemSuggestionInputSchema>;

const MenuItemSuggestionOutputSchema = z.object({
  suggestion: z.string().describe('The suggested menu item name.'),
  description: z.string().describe('A brief description of the suggested menu item.'),
});
export type MenuItemSuggestionOutput = z.infer<typeof MenuItemSuggestionOutputSchema>;

export async function suggestMenuItem(input: MenuItemSuggestionInput): Promise<MenuItemSuggestionOutput> {
  return menuItemSuggestionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'menuItemSuggestionPrompt',
  input: { schema: MenuItemSuggestionInputSchema },
  output: { schema: MenuItemSuggestionOutputSchema },
  prompt: `You are a world-class chef. Suggest a creative menu item for a restaurant that serves {{topic}}.`,
});


const menuItemSuggestionFlow = ai.defineFlow(
  {
    name: 'menuItemSuggestionFlow',
    inputSchema: MenuItemSuggestionInputSchema,
    outputSchema: MenuItemSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
