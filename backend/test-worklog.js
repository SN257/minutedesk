const { exec } = require('child_process');

// Test SQL to manually create tasks from existing work log
const sql = `
DO $$
DECLARE
    work_log_row RECORD;
    user_id_var UUID;
    board_id_var UUID;
    list_id_var UUID;
    task_text TEXT;
    tasks TEXT[];
BEGIN
    -- Get the work log entry
    SELECT * INTO work_log_row FROM work_logs WHERE date = '2026-02-06' LIMIT 1;
    
    IF work_log_row IS NOT NULL THEN
        user_id_var := work_log_row."userId";
        
        -- Find or create Daily Work board
        SELECT id INTO board_id_var FROM boards WHERE "userId" = user_id_var AND title = 'Daily Work';
        
        IF board_id_var IS NULL THEN
            INSERT INTO boards ("userId", title, "createdAt", "updatedAt")
            VALUES (user_id_var, 'Daily Work', NOW(), NOW())
            RETURNING id INTO board_id_var;
            RAISE NOTICE 'Created board: %', board_id_var;
        END IF;
        
        -- Find or create To Do list
        SELECT id INTO list_id_var FROM lists WHERE "boardId" = board_id_var AND title = 'To Do';
        
        IF list_id_var IS NULL THEN
            INSERT INTO lists ("boardId", title, "order", "createdAt", "updatedAt")
            VALUES (board_id_var, 'To Do', 0, NOW(), NOW())
            RETURNING id INTO list_id_var;
            RAISE NOTICE 'Created list: %', list_id_var;
        END IF;
        
        -- Split tomorrow work by newlines and create cards
        tasks := string_to_array(work_log_row."tomorrowWork", E'\\n');
        
        FOREACH task_text IN ARRAY tasks
        LOOP
            IF trim(task_text) != '' THEN
                INSERT INTO cards ("listId", title, "order", archived, "createdAt", "updatedAt")
                VALUES (list_id_var, trim(task_text), extract(epoch from now()) * 1000, false, NOW(), NOW());
                RAISE NOTICE 'Created card: %', trim(task_text);
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Successfully created tasks from work log';
    ELSE
        RAISE NOTICE 'No work log found for 2026-02-06';
    END IF;
END $$;
`;

exec(`psql -U postgres -d nexus -c "${sql.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
    if (error) {
        console.error('Error:', error);
        return;
    }
    console.log('Output:', stdout);
    if (stderr) console.error('Stderr:', stderr);
});
