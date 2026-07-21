-- Assemble deterministic Blender frames into a tagged Aseprite master.
local manifestPath = app.params["manifest"]
local inputDir = app.params["input"]
local outputPath = app.params["output"]
if not manifestPath or not inputDir or not outputPath then
  error("required parameters: manifest, input, output")
end

local file = io.open(manifestPath, "r")
if not file then error("cannot read manifest: " .. manifestPath) end
local manifest = json.decode(file:read("*a"))
file:close()

local sprite = Sprite(manifest.frame.width, manifest.frame.height, ColorMode.RGB)
sprite.filename = outputPath
sprite.layers[1].name = "Composite"

for frameNumber = 1, 17 do
  local path = app.fs.joinPath(inputDir, string.format("frame_%02d.png", frameNumber))
  local source = app.open(path)
  if not source then error("cannot open frame: " .. path) end
  local sourceCel = source.cels[1]
  local image = sourceCel.image:clone()
  source:close()
  local frame
  if frameNumber == 1 then
    frame = sprite.frames[1]
  else
    frame = sprite:newEmptyFrame(frameNumber)
  end
  sprite:newCel(sprite.layers[1], frame, image, Point(0, 0))
end

for _, state in ipairs(manifest.states) do
  local tag = sprite:newTag(state.from, state.to)
  tag.name = state.name
  tag.aniDir = AniDir.FORWARD
  for frameNumber = state.from, state.to do
    sprite.frames[frameNumber].duration = state.durationMs / 1000
  end
end

sprite:saveAs(outputPath)
sprite:close()
