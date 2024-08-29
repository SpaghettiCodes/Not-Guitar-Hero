import random
# gen lines
lines = ['user_played, instrument_name, velocity, pitch, start (s), end (s)']
for x in range(0, 1000):
        for y in range(4):
            lines.append(f'True,guitar-electric,50,{57 + (3 * y)},{x}.0,{x}.1666666666666665')
    # lines.append(f'True,guitar-electric,113,{random.randint(21, 127)},{x}.0,{x}.1666666666666665')

with open("./combo.csv", '+w') as file:
    file.write('\n'.join(lines))