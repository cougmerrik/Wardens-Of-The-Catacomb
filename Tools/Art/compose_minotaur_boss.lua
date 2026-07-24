local manifestPath = app.params["manifest"]
local inputDir = app.params["input"]
local outputDir = app.params["output"]
if not manifestPath or not inputDir or not outputDir then
  error("required parameters: manifest, input, output")
end

local file = io.open(manifestPath, "r")
if not file then error("cannot read manifest: " .. manifestPath) end
local manifest = json.decode(file:read("*a"))
file:close()

local asepriteDir = app.fs.joinPath(outputDir, "aseprite")
app.fs.makeDirectory(asepriteDir)

for _, variantDef in ipairs(manifest.variants) do
  local variant = variantDef.variant
  for _, actionDef in ipairs(manifest.actions) do
    local action = actionDef.action
    local frames = actionDef.frames
    local base = string.format("minotaur_%s_%s_8dir_%df", variant, action, frames)
    local rawPath = app.fs.joinPath(inputDir, string.format("raw_%s.png", base))
    local source = app.open(rawPath)
    if not source then error("cannot open raw sheet: " .. rawPath) end

    source.filename = app.fs.joinPath(asepriteDir, base .. ".aseprite")
    source.layers[1].name = "Blender Render"

    local tag = source:newTag(1, 1)
    tag.name = action
    tag.aniDir = actionDef.loop and AniDir.FORWARD or AniDir.FORWARD
    source.frames[1].duration = actionDef.durationMs / 1000

    source:saveAs(source.filename)
    source:saveAs(app.fs.joinPath(outputDir, base .. ".png"))
    source:close()
  end
end
