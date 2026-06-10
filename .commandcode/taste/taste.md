# Taste (Continuously Learned by [CommandCode][cmd])

[cmd]: https://commandcode.ai/

# communication
- Communicate in Spanish with this user. Confidence: 0.85

# cli
- Install skills/tools from GitHub repos using `npx skills add <author>/<repo>` syntax (e.g., `npx skills add pbakaus/impeccable`). Confidence: 0.75

# code-quality
- Validate that all imported components, variables, and references exist before writing code — never introduce undefined reference errors like `ReferenceError: X is not defined`. Confidence: 0.90
- Ensure the app is responsive for mobile/telefono devices. Confidence: 0.65

# webhook
- For WhatsApp webhook patient matching: prefer matching by phone number (unique identifier), not by pushName or name string matching. Confidence: 0.80

# terminal
- Prefer providing curl/bash commands for the user to run in their terminal, rather than saving files to /tmp/ or providing browser data URLs. Confidence: 0.72
- Use `npx` to run CLI tools like `impeccable` instead of `npm install` (they are meant to be executed, not added as dependencies). Confidence: 0.65

