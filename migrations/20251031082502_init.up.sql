CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    avatar VARCHAR(255),
    phone VARCHAR(50),
    username VARCHAR(50),
    nickname VARCHAR(100),
    company_id BIGINT,
    passwd VARCHAR(100),
    salt VARCHAR(100),
    created_at BIGINT,
    updated_at BIGINT,
    deleted_at BIGINT DEFAULT 0
);

INSERT INTO `users` (`id`, `avatar`, `phone`, `username`, `nickname`, `company_id`, `passwd`, `salt`, `created_at`, `updated_at`, `deleted_at`)
VALUES
    ('1', '', '1', 'root', 'root', '0', '899b50b367e7f4e6b5cdbc4518637866', '22f1782a', '1761899465', '1761899465', '0');


CREATE TABLE IF NOT EXISTS companys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    avatar VARCHAR(255),
    name VARCHAR(100),
    manager_user_id INT,
    balance BIGINT,
    created_at BIGINT,
    updated_at BIGINT
);


CREATE TABLE website_login_contexts (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       company_id BIGINT NOT NULL,
       user_id BIGINT NOT NULL,
       platform VARCHAR(50) NOT NULL,
       username VARCHAR(50) NOT NULL,
       avatar VARCHAR(255),
       fingerprint BOOLEAN DEFAULT FALSE,
       proxy JSON,
       browser_context TEXT NOT NULL,
       tags JSON,
       status TINYINT DEFAULT 1,
       created_at BIGINT,
       updated_at BIGINT
);

-- 添加图片库表
CREATE TABLE IF NOT EXISTS assets_libraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path VARCHAR(255) NOT NULL,
    title VARCHAR(20),
    type VARCHAR(20) NOT NULL,
    description TEXT,
    size BIGINT NOT NULL DEFAULT 0,
    suffix VARCHAR(20) NOT NULL,
    tags JSON,
    user_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    created_at BIGINT,
    updated_at BIGINT
);


-- 创建素材库表
CREATE TABLE IF NOT EXISTS material_libraries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    tags JSON,
    user_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

CREATE TABLE models (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_name VARCHAR(255) NOT NULL,
    model_name VARCHAR(255) NOT NULL,
    base_model VARCHAR(255) NOT NULL DEFAULT '',
    model_type VARCHAR(255) NOT NULL,
    credential JSON NOT NULL,
    region VARCHAR(255) DEFAULT '',
    endpoint_id VARCHAR(255) DEFAULT '',
    api_endpoint_host VARCHAR(255) DEFAULT '',
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    connectivity_status VARCHAR(50) NOT NULL DEFAULT 'not_tested',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    context_length BIGINT DEFAULT 0,
    user_id BIGINT NOT NULL,
    company_id BIGINT NOT NULL,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);


CREATE TABLE aieo_generates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    name VARCHAR(255) NOT NULL,
    keyword VARCHAR(255) NOT NULL DEFAULT '',
    target_word VARCHAR(255) NOT NULL DEFAULT '',
    user_questions JSON NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Image',
    image_library_id_list JSON NOT NULL,
    material_library_id_list JSON NOT NULL,
    create_num BIGINT NOT NULL DEFAULT 0,
    contents JSON NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Running',
    send_status VARCHAR(50) NOT NULL DEFAULT 'NotSent',
    send_infos JSON NOT NULL,
    error_info TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);


CREATE TABLE IF NOT EXISTS video_jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    title VARCHAR(20) NOT NULL,
    description TEXT,
    assets_id BIGINT,
    send_status VARCHAR(50) NOT NULL DEFAULT 'Sending',
    send_infos JSON NOT NULL,
    error_info TEXT,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);
