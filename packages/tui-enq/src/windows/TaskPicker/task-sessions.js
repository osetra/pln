export const taskSessionsManager = {
    updateSessionInDescription(description, sessions, timestamp, isNewSessionStart) {
        const yamlSeparator = '---';

        if (!description.startsWith(yamlSeparator)) {
            return `${yamlSeparator}\nsessions:\n  - [${timestamp}]\n${yamlSeparator}\n${description}`;
        }

        //const sessionsRegex = /sessions:\s*\n(?:\s*-\s*\[[^\]]*\](?:\s*,\s*\[[^\]]*\])*\s*\n)*/g;

        if (description.includes('sessions:')) {
            return this.updateExistingSessions(description, sessions, timestamp, isNewSessionStart);
        }
        return this.addSessionsToYaml(description, timestamp)
    },

    updateExistingSessions(description, sessions, timestamp, isNewSessionStart) {
        if (isNewSessionStart) {
            return description.replace(
                /(sessions:\s*\n(?:.*\n)*?)(\s*---)/,
                `$1  - [${timestamp}]\n$2`
            );
        }
        
        if (sessions.length > 0) {
            const lastSession = sessions.at(-1);
            if (lastSession.length === 1) {
                return description.replace(
                    /(sessions:\s*\n(?:.*\n)*?)(\s*-\s*\[[^\]]+\])\s*\n(\s*---)/,
                    `$1  - [${lastSession[0]}, ${timestamp}]\n$3`
                );
            }
        }
        
        return description.replace(
            /(sessions:\s*\n(?:.*\n)*?)(\s*---)/,
            `$1  - [${timestamp}]\n$2`
        );
    },

    addSessionsToYaml(description, timestamp) {
        return description.replace(
            /(---\s*\n(?:.*\n)*?)(---)/,
            `$1sessions:\n  - [${timestamp}]\n$2`
        );
    },
};
