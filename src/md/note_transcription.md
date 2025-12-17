# Dictate to Notion: Revamping My Personal Notekeeping Systems

This year I’m adding a wrinkle to my notetaking systems by dictating notes into my Notion daily planner page. Here, I describe why I felt this was a necessary change for me, the requirements to make the choice net beneficial, and how I built a [simple system](https://github.com/chstan/voice-notes) automating this process.

### Context

For years I’ve been an obsessive—though inconsistent—notetaker. While I used to use paper notes and LyX, Notion attracted me with its flexibility, fuzzy search, and LaTeX support. Since adoption, Notion has progressively eaten the rest of my digital life. I now count it as a ritual to work and study with a blank Notion page for technical notekeeping.

My Notion-centered approach shares an application boundary with my low-tech approach of carrying a pocket notebook. In the past, ideas and general notes from discussion with peers wound up in this notebook. After reaching the end of one of the paper inserts for the notebook, I would (sometimes) digitize relevant parts of these notebooks in Notion so that they were searchable. I usually lost marginalia in other print materials unless I stumbled back on these assorted notes again.

There were clear problems with this system, including:

- inconsistently handwriting or typing digital notes complicates searching for materials later
- high friction to taking a handwritten note
- data loss due to poor penmanship and terse handwritten notes
- inability to take notes on runs, during hallway discussions, or while listening to audio media

As someone who worked in a physics lab with large vacuum chambers for his PhD, using a voice recorder instead of a physical lab notebook has always been tempting. Taking notes around bulky equipment is easier by speaking, even leaving aside the issue of finding a pen in a disorganized lab. Dictating notes would also seem to fit the bill above by outright solving the friction and penmanship problems while better supplementing Notion. On the other hand, it introduces a transcription step before search and it's poor for math.

Since I'm taking the balance of advantages and disadvantages here, a comment on long-form notes. Anyone who has taught a class has learned that explaining ideas “long form” forces you to clarify your ideas. Better, it forces you to confront misunderstanding up front, where you can root it out. That poor ideas and fuzzy understanding can hide behind composed and rewritten notes notches yet another advantage for speech.

I concluded in favor of dictating notes, so long as I could automate the process of their annotation, their transcription, and their insertion into my existing Notion-centered system.

# Hardware

I carry a Sony ICD-UX570. The ICD-UX570 is convenient to take everywhere and removes dead space between messages. In contexts where continuous recording is undesirable, a single button press starts recording.

Any recorder would nominally satisfy this purpose provided a low bar to recording and physical convenience. Why use a voice recorder? These requirements indicate that a smartphone would work just as well, but I prefer a separate device. Using a recorder prevents distractions from context switching (or attention theft) on a smartphone and makes it easier to carry on a run.

What about dictating directly into Notion? In a perfect world, this could work, but consumer available automatic speech recognition remains imperfect in 2021. In this context, using speech-to-text to type a note is terrible: without the original audio there is no way to correct these transcription mistakes later. In cases, it may even be difficult to realize they are there.

# Software and Processes

In order to make this system one I could lean on throughout the day, the software and processes needed to

- retain original audio media and ensure they are searchable
- transcribe notes and annotate them with labeled speakers and timestamps into the source media
- format notes into Notion quickly enough that they can be reviewed the next day
- make it easy to integrate notes into longer term systems (Anki, etc.)

At its core, what I'm describing is a simple ETL task. While automatic speech recognition and transcript formatting drive most of the complexity, if I wanted to trust this system to work for years in the background care towards the glue mattered too. Coarsely, I settled on a solution using

- AWS S3 for archiving and retention
- AWS Transcribe for ASR
- Python and the crontab for orchestration
- Thin wrappers around the Notion API for notes injection

## High Level Software Organization

A small Python module orchestrates the process of converting each `.mp3` note into text and ensuring that text makes its way into Notion. A `shelve` DB retains details about the processing status for each item. Status tracking permits introspection and resuming transcription later if there are issues with either AWS or Notion.

```python
class VoiceNoteStatus(int, Enum):
    """Enumerates data transform/ETL stages for transcription.

		Each increment in stage, with the exception of item eviction,
    represents a transformation which should be performed atomically.
    """

    Ingress = 0       # waiting for processing
    Local = 10        # saved in on disk archive only
    S3 = 20           # saved on S3
    Transcribed = 30  # finished AWS Transcribe job
    Notion = 40       # formatted text in Notion
    Evicted = 50      # item has no speech or was removed by user
```

The `shelve` DB retains this status, the date and time for the note, the transcript and all other information for each note.

The rest of the software provides high level abstractions and glues them together. Because `boto3` offers only a rudimentary HTTP client to AWS Transcribe, these abstractions include an asynchronous representation of AWS Transcribe batch jobs. Meanwhile, the beta Notion API is still primitive, especially for Python, so modeling high level data citizens in Notion like rich-text and the Notion "block" was necessary too.

The only other complicated code concerns how the AWS Transcribe data is turned into the Block objects which Notion expects. Because I wanted to add timestamp annotations so that cross referencing audio is simple, this makes translation from transcript to blocks challenging: we need to intersperse differently formatted blocks with the timestamps at defined intervals. The Notion API places both block size and block number limits on API requests, which adds minor technical sticking points too. 

### Reducing and Transcribing AWS Transcribe Results

At a very high level, AWS Transcribe provides results as token streams. This is an appropriate data model for speech, but reflects product requirements too: Transcribe operates both in batch and streaming orientations. The main data source is a token stream which sits next to a stream of speaker assignments, speech segments, and alternative transcriptions. The token index and the timing in the original audio provide two alignment signals between the token and metadata streams. Using this token index and time alignment, we can associate to each emitted token its alternative transcriptions, the identified speaker, and the accompanying text segment.

To minimize the number of blocks we eventually synchronize to Notion, we want to reduce this token stream down into a minimal number of blocks while preserving certain formatting characteristics: text from different speakers appears in separate paragraphs, interspersed timestamps at desired intervals. 

One conception of this task is that it consists of stateful stream processing. We translate the token and metadata streams into high level events and reduce compatible items together. Roughly, these high level events are Notion rich text objects carrying semantics either of speech (`TextItem`) or timetamps (`TimestampItem`). Rather than adding a new `TextItem` for each token, we ask delay emitting a rich text object until an incompatible source token, a timestamp or another speaker, is reached. 

(From a functional standpoint, this amounts to adding the timestamp tokens, grouping tokens, and reducing each group by concatenation.)

There are other details here, including configuring whether different speakers or different text segments should be concatenated together, which do not bear out interesting discussion. You can look at the contents of `transcript.py:Transcript:from_aws_transcribe_json` for details.

## Python Packaging and Process Details

The final details worth discussing concern packaging. Every year seems to bring new Python packaging heartache, but this project is simple enough that using `poetry` was a safe choice. Whenever using a package manager, you need to be sure how your environment will get bootstrapped if it is called by some external process. In this case, this is simple, the relevant lines in the crontab can run the entrypoint script as the user with `poetry` installed

```bash
0 * * * * su poetry_user -c "entrypoint_script.sh"
```

with the `entrypoint_script.sh` using

```bash
#!/bin/sh
PROJECT_DIR=...
cd "$PROJECT_DIR"
poetry run bash -c "python scripts/create_month_and_day_planning_page.py $*"
poetry run bash -c "python scripts/import_all.py"
```

to create the agenda and notes page where dictated notes will be added, and to import all the collected dictated notes.

Another script copies all files from the internal memory of the ICD UX570 to the ingress folder for the cronjob when it is plugged into my computer. The transcribed notes appear a few minutes later in the appropriate Notion page.

If you’re curious, full code is available in [a GitHub repository](https://github.com/chstan/voice-notes).

[https://github.com/chstan/voice-notes](https://github.com/chstan/voice-notes)