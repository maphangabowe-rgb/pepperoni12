export async function generatePepperoniResponse(rantContent: string, mood: string) {
  try {
    const response = await fetch("/api/critique", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content: rantContent, mood }),
    });

    if (!response.ok) {
      throw new Error("Failed to get chef's response");
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error generating Pepperoni response:", error);
    return "This rant is so hot it broke the oven! Keep browning those frustrations.";
  }
}
