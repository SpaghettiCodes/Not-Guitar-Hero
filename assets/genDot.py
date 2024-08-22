import random
# gen lines
lines = ['user_played, instrument_name, velocity, pitch, start (s), end (s)']
for x in range(0, 1000):
        lines.append(f'True,guitar-electric,113,57,{x}.0,{x}.1666666666666665')
    # lines.append(f'True,guitar-electric,113,{random.randint(21, 127)},{x}.0,{x}.1666666666666665')

with open("./dot.csv", '+w') as file:
    file.write('\n'.join(lines))