# Patch 分支日常同步（详细标准流程）

适用场景：你长期维护一个上游不接受的补丁分支（例如 `patch/json-stream-compact`），同时希望持续跟进上游 `main`。

---

## 1. 分支模型（先固定规则）

建议长期保持以下结构：

- `upstream/main`：原项目主线（只读，不直接改）
- `main`（你的仓库）：尽量跟上游一致，不放私有 patch
- `patch/<name>`：只放你自己的补丁提交

示例：

- `patch/json-stream-compact`：仅包含你本地需要长期保留的 3 个提交

这样做的收益：

- 更新上游时影响面小
- 补丁边界清晰
- 出问题时容易判断是“上游变化”还是“补丁变化”

---

## 2. 同步前检查（每次都做）

在执行同步前，先确认工作区干净：

```bash
git status -sb
```

期望：没有未提交修改。

如果有改动，先处理（提交或临时转存），不要在脏工作区直接 rebase。

再确认远端配置是否正确：

```bash
git remote -v
```

应至少看到：

- `upstream` 指向原项目仓库
- `origin` 指向你的 fork

---

## 3. 标准日常同步流程（推荐：rebase upstream/main）

### 步骤 1：抓取最新上游

```bash
git fetch upstream
```

### 步骤 2：切到补丁分支

```bash
git checkout patch/json-stream-compact
```

### 步骤 3：把补丁重放到最新上游之上

```bash
git rebase upstream/main
```

> 这一步会重写补丁提交 SHA，属于正常行为。

### 步骤 4：如果冲突，按标准方式解

```bash
# 查看冲突文件
git status

# 编辑冲突文件，人工确认语义
# 标记已解决
git add <conflicted-files>

# 继续
git rebase --continue
```

如需放弃本次 rebase：

```bash
git rebase --abort
```

### 步骤 5：同步到远端分支

```bash
git push --force-with-lease origin patch/json-stream-compact
```

> 因为 rebase 改了历史，所以这里通常必须 force push。请使用 `--force-with-lease`，不要用 `--force`。

---

## 4. 同步后核对（判断是否成功）

### 4.1 看本地与远端补丁分支是否一致

```bash
git status -sb
```

期望：`patch/json-stream-compact...origin/patch/json-stream-compact` 后面没有 ahead/behind。

### 4.2 看你是否跟上上游 main

```bash
git rev-list --left-right --count upstream/main...HEAD
```

输出含义：

- 左边：`upstream/main` 独有提交数（你落后多少）
- 右边：当前补丁分支独有提交数（你的 patch 数量）

理想状态：`0 3`（示例，表示不落后上游且保留 3 个私有补丁提交）。

### 4.3 快速检查提交顶部

```bash
git log --oneline --decorate -n 10
```

确认顶部是你预期的 patch 提交，不应出现重复补丁提交或意外 merge commit。

---

## 5. 常见现象解释

### 现象 A：同步后“ahead 数突然变大”

常见原因：你做了 rebase，但还没推送；或本地/远端历史不一致。

处理：

1. 先看相对 `upstream/main` 的计数（`git rev-list --left-right --count upstream/main...HEAD`）
2. 若左边为 0，说明已跟上上游
3. 推送 `--force-with-lease` 后再看 `git status -sb`

### 现象 B：出现重复 patch 提交

常见原因：rebase 后又做了 merge（或 pull 触发 merge）。

建议：重建干净补丁分支（见第 7 节）。

---

## 6. 注意事项（严格执行）

1. **只在 patch 分支放私有补丁**
   - `main` 尽量保持干净。

2. **每次都先 fetch upstream**
   - 不要基于旧状态 rebase。

3. **优先 rebase，不要混用 merge**
   - rebase + merge 混用最容易造成重复历史。

4. **force push 只能用 `--force-with-lease`**
   - 降低误覆盖风险。

5. **补丁提交要小且独立**
   - 功能、测试/文档分开，降低冲突处理复杂度。

6. **冲突解决后先校验语义，再继续**
   - 不要只为过冲突而过冲突。

7. **同步后执行最小回归验证**
   - 至少运行和补丁直接相关的测试文件。

---

## 7. 历史变脏时的“干净重建”流程（推荐保底）

当分支出现重复提交、merge 噪音较多时，用 cherry-pick 快速重建：

```bash
git fetch upstream
git checkout -b patch/json-stream-compact-clean upstream/main
git cherry-pick <patch-commit-1> <patch-commit-2> <patch-commit-3>
```

验证没问题后，用新分支替换旧分支：

```bash
# 可选：先备份旧分支名
git branch -m patch/json-stream-compact patch/json-stream-compact-old

# clean 分支改为正式名
git branch -m patch/json-stream-compact-clean patch/json-stream-compact

# 推送替换远端
git push --force-with-lease -u origin patch/json-stream-compact
```

---

## 8. 备份补丁（防丢失）

定期导出补丁文件：

```bash
git format-patch -3 HEAD
```

未来可在任意新分支重放：

```bash
git checkout -b patch/json-stream-compact-v2 upstream/main
git am *.patch
```

---

## 9. 不改历史的备选方案（merge）

如果你明确不希望 force push，可使用 merge：

```bash
git fetch upstream
git checkout patch/json-stream-compact
git merge upstream/main
git push origin patch/json-stream-compact
```

代价：历史会逐渐复杂，长期可维护性通常不如 rebase 方案。

---

## 10. 每周例行同步 checklist（可直接复制执行）

> 下面是一套可直接粘贴执行的最小化周更流程。

```bash
# [0] 切到补丁分支
git checkout patch/json-stream-compact

# [1] 确认工作区干净
git status -sb

# [2] 拉取上游最新
git fetch upstream

# [3] 重放补丁到 upstream/main
git rebase upstream/main

# [4] 推送到你的远端（rebase 后通常需要）
git push --force-with-lease origin patch/json-stream-compact

# [5] 核对：与 origin 补丁分支一致
git status -sb

# [6] 核对：不落后上游，且只保留预期 patch 数
git rev-list --left-right --count upstream/main...HEAD

# [7] 核对：顶部提交是否干净
git log --oneline --decorate -n 10
```

### 每周完成标准

满足以下三条即可视为同步成功：

1. `git status -sb` 显示本地与 `origin/patch/json-stream-compact` 无 ahead/behind。
2. `git rev-list --left-right --count upstream/main...HEAD` 左值为 `0`。
3. `git log -n 10` 顶部提交仅为预期 patch（无重复 patch、无意外 merge 噪音）。

### 出现冲突时的快速处理

```bash
# 查看冲突
git status

# 解决后标记
git add <conflicted-files>

# 继续 rebase
git rebase --continue

# 若需要放弃本次同步
git rebase --abort
```

---

## 结论

长期维护私有 patch 的标准做法是：

**`fetch upstream` → `rebase upstream/main` → `push --force-with-lease` → 三步核对（status / rev-list / log）**。

只要持续按这个流程执行，你会同时获得：

- 上游最新更新
- 稳定保留私有补丁
- 可控、可恢复的分支历史
